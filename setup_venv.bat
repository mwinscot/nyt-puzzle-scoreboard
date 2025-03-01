@echo off
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo Virtual environment created and dependencies installed.
echo To activate the virtual environment, run: venv\Scripts\activate
