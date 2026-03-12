import { useEffect, useState } from "react";

export type DianEnvironment = "testing" | "production";

const DIAN_ENVIRONMENT_STORAGE_KEY = "naturerp:dian-environment";
const DIAN_ENVIRONMENT_CHANGE_EVENT = "naturerp:dian-environment-change";

function readEnvironment(): DianEnvironment {
  const value = localStorage.getItem(DIAN_ENVIRONMENT_STORAGE_KEY);
  return value === "production" ? "production" : "testing";
}

export function setDianEnvironment(nextEnvironment: DianEnvironment) {
  localStorage.setItem(DIAN_ENVIRONMENT_STORAGE_KEY, nextEnvironment);
  window.dispatchEvent(
    new CustomEvent(DIAN_ENVIRONMENT_CHANGE_EVENT, {
      detail: nextEnvironment,
    }),
  );
}

export function useDianEnvironment() {
  const [environment, setEnvironment] = useState<DianEnvironment>(() => readEnvironment());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DIAN_ENVIRONMENT_STORAGE_KEY) {
        setEnvironment(readEnvironment());
      }
    };

    const handleEnvironmentChange = () => {
      setEnvironment(readEnvironment());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(DIAN_ENVIRONMENT_CHANGE_EVENT, handleEnvironmentChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DIAN_ENVIRONMENT_CHANGE_EVENT, handleEnvironmentChange);
    };
  }, []);

  return { environment, setEnvironment: setDianEnvironment };
}
