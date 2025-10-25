import collections
import json
import os

import datasets


_HOMEPAGE = "https://universe.roboflow.com/imacs-pothole-detection-wo8mu/pothole-detection-irkz9/dataset/4"
_LICENSE = "CC BY 4.0"
_CITATION = """\
@misc{ pothole-detection-irkz9_dataset,
    title = { Pothole Detection Dataset },
    type = { Open Source Dataset },
    author = { IMACS Pothole Detection },
    howpublished = { \\url{ https://universe.roboflow.com/imacs-pothole-detection-wo8mu/pothole-detection-irkz9 } },
    url = { https://universe.roboflow.com/imacs-pothole-detection-wo8mu/pothole-detection-irkz9 },
    journal = { Roboflow Universe },
    publisher = { Roboflow },
    year = { 2023 },
    month = { jan },
    note = { visited on 2023-01-15 },
}
"""
_CATEGORIES = ['pothole']
_ANNOTATION_FILENAME = "_annotations.coco.json"


class POTHOLESEGMENTATIONConfig(datasets.BuilderConfig):
    """Builder Config for pothole-segmentation"""

    def __init__(self, data_urls, **kwargs):
        """
        BuilderConfig for pothole-segmentation.

        Args:
          data_urls: `dict`, name to url to download the zip file from.
          **kwargs: keyword arguments forwarded to super.
        """
        super(POTHOLESEGMENTATIONConfig, self).__init__(version=datasets.Version("1.0.0"), **kwargs)
        self.data_urls = data_urls


class POTHOLESEGMENTATION(datasets.GeneratorBasedBuilder):
    """pothole-segmentation instance segmentation dataset"""

    VERSION = datasets.Version("1.0.0")
    BUILDER_CONFIGS = [
        POTHOLESEGMENTATIONConfig(
            name="full",
            description="Full version of pothole-segmentation dataset.",
            data_urls={
                "train": "https://huggingface.co/datasets/keremberke/pothole-segmentation/resolve/main/data/train.zip",
                "validation": "https://huggingface.co/datasets/keremberke/pothole-segmentation/resolve/main/data/valid.zip",
                "test": "https://huggingface.co/datasets/keremberke/pothole-segmentation/resolve/main/data/test.zip",
            },
        ),
        POTHOLESEGMENTATIONConfig(
            name="mini",
            description="Mini version of pothole-segmentation dataset.",
            data_urls={
                "train": "https://huggingface.co/datasets/keremberke/pothole-segmentation/resolve/main/data/valid-mini.zip",
                "validation": "https://huggingface.co/datasets/keremberke/pothole-segmentation/resolve/main/data/valid-mini.zip",
                "test": "https://huggingface.co/datasets/keremberke/pothole-segmentation/resolve/main/data/valid-mini.zip",
            },
        )
    ]

    def _info(self):
        features = datasets.Features(
            {
                "image_id": datasets.Value("int64"),
                "image": datasets.Image(),
                "width": datasets.Value("int32"),
                "height": datasets.Value("int32"),
                "objects": datasets.Sequence(
                    {
                        "id": datasets.Value("int64"),
                        "area": datasets.Value("int64"),
                        "bbox": datasets.Sequence(datasets.Value("float32"), length=4),
                        "segmentation": datasets.Sequence(datasets.Sequence(datasets.Value("float32"))),
                        "category": datasets.ClassLabel(names=_CATEGORIES),
                    }
                ),
            }
        )
        return datasets.DatasetInfo(
            features=features,
            homepage=_HOMEPAGE,
            citation=_CITATION,
            license=_LICENSE,
        )

    def _split_generators(self, dl_manager):
        data_files = dl_manager.download_and_extract(self.config.data_urls)
        return [
            datasets.SplitGenerator(
                name=datasets.Split.TRAIN,
                gen_kwargs={
                    "folder_dir": data_files["train"],
                },
            ),
            datasets.SplitGenerator(
                name=datasets.Split.VALIDATION,
                gen_kwargs={
                    "folder_dir": data_files["validation"],
                },
            ),
            datasets.SplitGenerator(
                name=datasets.Split.TEST,
                gen_kwargs={
                    "folder_dir": data_files["test"],
                },
            ),
]

    def _generate_examples(self, folder_dir):
        def process_annot(annot, category_id_to_category):
            return {
                "id": annot["id"],
                "area": annot["area"],
                "bbox": annot["bbox"],
                "segmentation": annot["segmentation"],
                "category": category_id_to_category[annot["category_id"]],
            }

        image_id_to_image = {}
        idx = 0

        annotation_filepath = os.path.join(folder_dir, _ANNOTATION_FILENAME)
        with open(annotation_filepath, "r") as f:
            annotations = json.load(f)
        category_id_to_category = {category["id"]: category["name"] for category in annotations["categories"]}
        image_id_to_annotations = collections.defaultdict(list)
        for annot in annotations["annotations"]:
            image_id_to_annotations[annot["image_id"]].append(annot)
        filename_to_image = {image["file_name"]: image for image in annotations["images"]}

        for filename in os.listdir(folder_dir):
            filepath = os.path.join(folder_dir, filename)
            if filename in filename_to_image:
                image = filename_to_image[filename]
                objects = [
                    process_annot(annot, category_id_to_category) for annot in image_id_to_annotations[image["id"]]
                ]
                with open(filepath, "rb") as f:
                    image_bytes = f.read()
                yield idx, {
                    "image_id": image["id"],
                    "image": {"path": filepath, "bytes": image_bytes},
                    "width": image["width"],
                    "height": image["height"],
                    "objects": objects,
                }
                idx += 1
