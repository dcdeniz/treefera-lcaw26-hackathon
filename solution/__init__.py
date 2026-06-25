"""Cloud-Proof Forest Carbon Integrity — Treefera LCAW26 hackathon solution.

A per-pixel pipeline that fuses AlphaEarth (AEF) embeddings with Sentinel-1 SAR to
classify land cover / forest, evaluated with spatially-honest cross-validation and
cross-checked against Hansen forest-loss. Built on the Chablis (France) demo bundle;
the real cloudy-tropics (Congo/Borneo) data drops into the same loaders on the day.
"""
