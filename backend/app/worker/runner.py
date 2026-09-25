import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MedAIWorker")

def main():
    logger.info("MedAI Studio Worker process started.")
    logger.info("Polling jobs table... (Research prototype — not for clinical use)")
    while True:
        time.sleep(10)

if __name__ == "__main__":
    main()
