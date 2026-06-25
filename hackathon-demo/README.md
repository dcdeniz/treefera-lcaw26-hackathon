# Treefera hackathon — example notebooks (self-contained bundle)

Everything you need to run the four example notebooks is in this folder. There are no cloud credentials, no S3 access, and nothing else to download — the data is bundled in `hackathon_demo_data/`.

## What is here

- `01_sentinel2_optical.ipynb` ... `04_aef_embeddings_and_ecostress.ipynb` — the four example notebooks (shipped already executed, so you can read them like a report before running).
- `hackathon_demo_data/` — the clipped demo data the notebooks read. See
  `hackathon_demo_data/README.md` for a full data dictionary and caveats.
- `pyproject.toml`, `requirements.txt`, `uv.lock` — the Python environment definition.
- `*.png` — reference figures showing what each notebook produces.

## Run it

Recommended: [uv](https://docs.astral.sh/uv/) (manages an isolated environment, Python >= 3.11).

1. Install uv: https://docs.astral.sh/uv/getting-started/installation/
2. In this folder, create the environment:

   ```bash
   uv sync
   ```

3. Register this environment as a Jupyter kernel (one-off):

   ```bash
   uv run python -m ipykernel install --user --name hackathon-demo
   ```

4. Launch JupyterLab and open any notebook:

   ```bash
   uv run jupyter lab
   ```

   In JupyterLab, select the **hackathon-demo** kernel (top-right kernel name, or
   Kernel -> Change Kernel). **Do not** use the default Python 3 kernel: the system Python
   ships an old zarr that cannot read the zarr v3 stores in `hackathon_demo_data/`, so the
   notebooks will fail to open the data.

### VSCode

1. Run `uv sync` (step 2 above) in this folder.
2. Open this folder in VSCode and open a notebook.
3. Click **Select Kernel** (top-right) -> **Python Environments** -> the `.venv` for this
   folder (`.venv/bin/python`). This is the uv environment with the correct zarr — do not
   pick the global Python 3.10 interpreter.
4. Run cells with Shift+Enter, or Run All.

### Plain pip / venv

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m ipykernel install --user --name hackathon-demo
jupyter lab
```

## Notes

- No AWS or credentials are needed — every notebook reads `hackathon_demo_data/` from local disk.
- Sentinel-2 (notebook 01) uses a small clip of the A_koranga_forks_nz site (New Zealand);
  the other notebooks use the D_Chablis_Vineyard site (Burgundy, France). They differ on purpose
  — see `hackathon_demo_data/README.md`.
- Key caveats are documented in the data README and demonstrated in the notebooks: Sentinel-2
  reflectance is not baseline-harmonised (a step at 2022-01-25), Sentinel-1 is in dB, and
  ECOSTRESS coverage is sparse by design.
- This is a small clipped subset for setup and familiarisation, not a full analysis dataset.
