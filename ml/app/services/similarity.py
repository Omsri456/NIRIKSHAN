"""
NIRIKSHAN — Model 4: Similar Work Detection (NLP)
===================================================
Identifies potentially duplicate or highly similar works using
sentence embeddings and cosine similarity.

Approach:
  1. Encode all work descriptions into vectors using a sentence transformer
  2. Use sklearn NearestNeighbors for efficient similarity lookup
  3. Filter candidates by metadata (same state/district, close dates)
  4. Flag pairs above similarity threshold (0.85)

Model: all-MiniLM-L6-v2 (80MB, fast, good for MVP)
  - Can be upgraded to paraphrase-multilingual-mpnet-base-v2 for better
    Hindi/regional language support

Per AI-SPEC Section 7:
  "The UI should say 'Potentially similar work detected', not
   'Confirmed duplicate' unless independently verified."
"""

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics.pairwise import cosine_similarity
import json


# Lazy-load sentence_transformers to avoid import overhead when not needed
_encoder_model = None


def _get_encoder():
    """Lazy-load the sentence transformer model."""
    global _encoder_model
    if _encoder_model is None:
        from sentence_transformers import SentenceTransformer
        print("  [Similarity] Loading sentence transformer model...")
        _encoder_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("  [Similarity] Model loaded.")
    return _encoder_model


class SimilarityDetector:
    """
    Similar work detection using sentence embeddings + cosine similarity.

    Pipeline:
      1. Clean and normalise descriptions
      2. Compute embeddings for all works
      3. For each work, find K nearest neighbors
      4. Filter by similarity threshold and metadata overlap
      5. Return top matches

    Outputs a dict: {workId → [{matchedWorkId, similarity, description}]}
    """

    MODEL_VERSION = "similarity-v1.0"

    def __init__(self, similarity_threshold: float = 0.85, top_k: int = 5):
        self.similarity_threshold = similarity_threshold
        self.top_k = top_k
        self._embeddings = None
        self._work_ids = None
        self._descriptions = None
        self._states = None
        self._districts = None

    @staticmethod
    def clean_description(desc: str) -> str:
        """Normalise a work description for embedding."""
        if not desc or not isinstance(desc, str):
            return ""
        # Lowercase, strip extra whitespace
        desc = desc.lower().strip()
        # Remove extra spaces
        desc = ' '.join(desc.split())
        return desc

    def compute_embeddings(self, df: pd.DataFrame) -> np.ndarray:
        """Compute sentence embeddings for all work descriptions."""
        descriptions = df['workDescription'].fillna('').apply(self.clean_description).tolist()
        encoder = _get_encoder()

        print(f"  [Similarity] Encoding {len(descriptions):,} descriptions...")
        # Batch encode (handles memory efficiently)
        embeddings = encoder.encode(
            descriptions,
            batch_size=256,
            show_progress_bar=True,
            normalize_embeddings=True,  # Pre-normalise for cosine similarity
        )
        print(f"  [Similarity] Encoding complete. Shape: {embeddings.shape}")
        return embeddings

    def batch_detect(self, df: pd.DataFrame, save_path: str | None = None) -> dict:
        """
        Detect similar works across the entire dataset.

        Returns:
            dict: {workId → [{matchedWorkId, similarity, description, state, district}]}
        """
        # Store metadata for filtering
        self._work_ids = df['workId'].astype(str).values
        self._descriptions = df['workDescription'].fillna('').values
        self._states = df['state'].fillna('').values
        self._districts = df['district'].fillna('').values

        # Step 1: Compute embeddings
        self._embeddings = self.compute_embeddings(df)

        # Step 2: Find exact duplicates first (fast, no embedding needed)
        print("  [Similarity] Finding exact duplicate descriptions...")
        desc_clean = df['workDescription'].fillna('').apply(self.clean_description)
        exact_dupes = desc_clean[desc_clean.duplicated(keep=False)]
        exact_dupe_count = len(exact_dupes)
        print(f"  [Similarity] Exact duplicates: {exact_dupe_count:,} rows")

        # Step 3: Use NearestNeighbors for efficient similarity lookup
        print(f"  [Similarity] Building nearest neighbor index (k={self.top_k + 1})...")
        # k+1 because each work is its own nearest neighbor
        nn = NearestNeighbors(
            n_neighbors=min(self.top_k + 1, len(df)),
            metric='cosine',
            algorithm='brute',  # For cosine metric, brute force is efficient enough
            n_jobs=-1,
        )
        nn.fit(self._embeddings)

        print("  [Similarity] Querying nearest neighbors...")
        distances, indices = nn.kneighbors(self._embeddings)
        # Convert cosine distance to similarity: similarity = 1 - distance
        similarities = 1 - distances

        # Step 4: Build results dict
        print("  [Similarity] Filtering matches above threshold...")
        results = {}
        total_matches = 0

        for i in range(len(df)):
            work_id = str(self._work_ids[i])
            matches = []

            for j_idx in range(1, similarities.shape[1]):  # Skip self (index 0)
                neighbor_idx = indices[i, j_idx]
                sim_score = float(similarities[i, j_idx])

                if sim_score < self.similarity_threshold:
                    continue  # Below threshold

                matched_id = str(self._work_ids[neighbor_idx])
                if matched_id == work_id:
                    continue  # Skip self

                # Metadata overlap check (boosts confidence)
                same_state = self._states[i] == self._states[neighbor_idx]
                same_district = self._districts[i] == self._districts[neighbor_idx]

                matches.append({
                    "workId": matched_id,
                    "similarity": round(sim_score, 4),
                    "description": str(self._descriptions[neighbor_idx])[:200],
                    "state": str(self._states[neighbor_idx]),
                    "district": str(self._districts[neighbor_idx]),
                    "sameState": same_state,
                    "sameDistrict": same_district,
                })

            if matches:
                results[work_id] = matches
                total_matches += len(matches)

        print(f"  [Similarity] Found {total_matches:,} matches across "
              f"{len(results):,} works (threshold: {self.similarity_threshold})")

        # Save if path provided
        if save_path:
            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"  [Similarity] Results saved to {save_path}")

        return results

    def find_similar(self, description: str, state: str = "",
                     district: str = "") -> list[dict]:
        """
        Find works similar to a given description (online query).
        Requires embeddings to be pre-computed via batch_detect().
        """
        if self._embeddings is None:
            raise RuntimeError("Embeddings not computed. Run batch_detect() first.")

        encoder = _get_encoder()
        clean_desc = self.clean_description(description)
        query_embedding = encoder.encode([clean_desc], normalize_embeddings=True)

        # Compute similarities
        sims = cosine_similarity(query_embedding, self._embeddings)[0]

        # Get top-k
        top_indices = np.argsort(sims)[::-1][:self.top_k]

        matches = []
        for idx in top_indices:
            sim = float(sims[idx])
            if sim < self.similarity_threshold:
                continue

            matches.append({
                "workId": str(self._work_ids[idx]),
                "similarity": round(sim, 4),
                "description": str(self._descriptions[idx])[:200],
                "state": str(self._states[idx]),
                "district": str(self._districts[idx]),
                "sameState": state == self._states[idx] if state else False,
                "sameDistrict": district == self._districts[idx] if district else False,
            })

        return matches

    def get_evidence(self, work_id: str, similarity_results: dict) -> dict | None:
        """Generate human-readable evidence for similarity matches."""
        matches = similarity_results.get(str(work_id), [])
        if not matches:
            return None

        best_match = max(matches, key=lambda m: m['similarity'])
        sim_pct = int(best_match['similarity'] * 100)

        if sim_pct < 85:
            return None

        severity = 'MEDIUM' if sim_pct < 90 else 'HIGH'
        location_note = ""
        if best_match.get('sameDistrict'):
            location_note = " in the same district"
        elif best_match.get('sameState'):
            location_note = " in the same state"

        return {
            "category": "DUPLICATE",
            "severity": severity,
            "title": "Potential Duplicate Work Detected",
            "description": (
                f"{sim_pct}% description match with Work ID '{best_match['workId']}'"
                f"{location_note}."
            ),
            "metrics": {
                "matchedWorkId": best_match['workId'],
                "similarityScore": best_match['similarity'],
                "matchedWorkDescription": best_match['description'],
                "sameState": best_match.get('sameState', False),
                "sameDistrict": best_match.get('sameDistrict', False),
            }
        }

    def save_embeddings(self, path: str):
        """Save computed embeddings to disk for reuse."""
        if self._embeddings is not None:
            np.savez_compressed(
                path,
                embeddings=self._embeddings,
                work_ids=self._work_ids,
            )
            print(f"  [Similarity] Embeddings saved to {path}")

    def load_embeddings(self, path: str, df: pd.DataFrame):
        """Load pre-computed embeddings from disk."""
        data = np.load(path, allow_pickle=True)
        self._embeddings = data['embeddings']
        self._work_ids = data['work_ids']
        self._descriptions = df['workDescription'].fillna('').values
        self._states = df['state'].fillna('').values
        self._districts = df['district'].fillna('').values
        print(f"  [Similarity] Embeddings loaded from {path}. Shape: {self._embeddings.shape}")
