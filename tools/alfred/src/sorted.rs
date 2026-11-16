use std::cmp::Ordering;

pub fn sorted_by<T>(mut items: Vec<T>, order: impl FnMut(&T, &T) -> Ordering) -> Vec<T> {
    items.sort_by(order);
    items
}

pub fn sorted_by_key<T, K: Ord>(mut items: Vec<T>, key: impl FnMut(&T) -> K) -> Vec<T> {
    items.sort_by_key(key);
    items
}
