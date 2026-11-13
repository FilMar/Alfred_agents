use serde::{Deserialize, Serialize};

use crate::sorted::sorted_by;

pub const NEAR_ITEMS_LIMIT: usize = 3000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Pair {
    pub a: String,
    pub b: String,
    pub score: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NearPair {
    #[serde(flatten)]
    pub pair: Pair,
    pub a_text: String,
    pub b_text: String,
}

pub fn cosine(left: &[f32], right: &[f32]) -> f32 {
    debug_assert!(left.len() == right.len(), "cosine: same length");
    let result: f32 = {
        let dot: f32 = left.iter().zip(right).map(|(x, y)| x * y).sum();
        let left_norm: f32 = left.iter().map(|x| x * x).sum::<f32>().sqrt();
        let right_norm: f32 = right.iter().map(|x| x * x).sum::<f32>().sqrt();
        if left_norm > 0.0 && right_norm > 0.0 {
            (dot / (left_norm * right_norm)).clamp(-1.0, 1.0)
        } else {
            0.0
        }
    };
    debug_assert!((-1.0..=1.0).contains(&result), "cosine: between -1 and 1");
    result
}

pub fn near_pairs(items: &[(String, Vec<f32>)], min: f32, limit: usize) -> Vec<Pair> {
    debug_assert!(
        items.len() <= NEAR_ITEMS_LIMIT,
        "near_pairs: at most 3000 items"
    );
    let close: Vec<Pair> = items
        .iter()
        .enumerate()
        .flat_map(|(i, (a, left))| {
            items[i + 1..]
                .iter()
                .filter(move |(b, _)| b != a)
                .filter_map(move |(b, right)| {
                    let score = cosine(left, right);
                    (score >= min).then(|| Pair {
                        a: a.clone(),
                        b: b.clone(),
                        score,
                    })
                })
        })
        .collect();
    let ranked_all = sorted_by(close, |x, y| {
        (y.score.total_cmp(&x.score)).then_with(|| (&x.a, &x.b).cmp(&(&y.a, &y.b)))
    });
    let result: Vec<Pair> = ranked_all.into_iter().take(limit).collect();
    debug_assert!(result.len() <= limit, "near_pairs: at most limit pairs");
    debug_assert!(
        result.iter().all(|p| p.a != p.b && p.score >= min),
        "near_pairs: two rules, at least min"
    );
    debug_assert!(ranked(&result), "near_pairs: closest first, then by ids");
    result
}

fn ranked(pairs: &[Pair]) -> bool {
    pairs
        .windows(2)
        .all(|w| (w[0].score, &w[1].a, &w[1].b) >= (w[1].score, &w[0].a, &w[0].b))
}
