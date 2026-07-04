from pathlib import Path
import os

class Config:
    BASE_DIR = Path(__file__).resolve().parent
    OUTPUT_DIR = BASE_DIR / "outputs"

    @staticmethod
    def get_output_path(filename: str):
        Config.OUTPUT_DIR.mkdir(exist_ok=True)
        return Config.OUTPUT_DIR / filename