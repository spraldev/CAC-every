---
dataset_info:
  features:
  - name: image
    dtype: image
  - name: label
    dtype: image
  splits:
  - name: train
    num_bytes: 6311570.0
    num_examples: 79
  - name: validation
    num_bytes: 337776.0
    num_examples: 5
  download_size: 6599847
  dataset_size: 6649346.0
configs:
- config_name: default
  data_files:
  - split: train
    path: data/train-*
  - split: validation
    path: data/validation-*
---
