use serde::{Deserialize, Serialize};

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
    let result: Vec<Pair> = {
        let mut pairs: Vec<Pair> = Vec::new();
        let mut seen: std::collections::HashSet<(&str, &str)> = std::collections::HashSet::new();
        for (i, (id_a, vector_a)) in items.iter().enumerate() {
            for (id_b, vector_b) in &items[(i + 1)..] {
                if id_a == id_b {
                    continue;
                }
                let a = id_a.min(id_b);
                let b = id_a.max(id_b);
                let score = cosine(vector_a, vector_b);
                if score >= min && seen.insert((a.as_str(), b.as_str())) {
                    pairs.push(Pair {
                        a: a.clone(),
                        b: b.clone(),
                        score,
                    });
                }
            }
        }
        pairs.sort_by(|x, y| {
            y.score
                .total_cmp(&x.score)
                .then_with(|| x.a.cmp(&y.a))
                .then_with(|| x.b.cmp(&y.b))
        });
        pairs.truncate(limit);
        pairs
    };
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
