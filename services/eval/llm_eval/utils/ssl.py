import os

import certifi

from llm_eval.config.paths import DATA_DIR
from llm_eval.settings import SETTINGS


def setup_custom_ssl_cert() -> None:
    custom_cert_file = SETTINGS.custom_ssl_cert_file

    if custom_cert_file:
        combined_cert_path = DATA_DIR / "combined_cert.pem"
        with open(combined_cert_path, "wb") as out_file:
            for cert_path in (custom_cert_file, certifi.where()):
                with open(cert_path, "rb") as cert_file:
                    out_file.write(cert_file.read())

        os.environ["SSL_CERT_FILE"] = str(combined_cert_path.absolute())
