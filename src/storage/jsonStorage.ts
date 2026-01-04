// src/storage/jsonStorage.ts

import fs from "fs";
import path from "path";

/**
 * Serviço genérico para leitura e escrita de arquivos JSON.
 * - Garante que o diretório /src/data existe.
 * - Garante que o arquivo existe com um valor padrão.
 * - Lê e grava objetos tipados em disco.
 */
export class JsonStorage<T> {
  private filePath: string;

  constructor(filename: string) {
    const dataDir = path.resolve(__dirname, "../data");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.filePath = path.join(dataDir, filename);
  }

  /**
   * Garante que o arquivo existe em disco.
   * Se não existir, cria com o valor default informado.
   */
  ensureFileExists(defaultValue: T): void {
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(defaultValue, null, 2),
        "utf-8"
      );
    }
  }

  /**
   * Lê todo o conteúdo do arquivo JSON.
   * Se não existir ou der erro de parse, retorna o defaultValue.
   */
  readAll(defaultValue: T): T {
    this.ensureFileExists(defaultValue);

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      if (!raw.trim()) {
        return defaultValue;
      }
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Sobrescreve o conteúdo do arquivo JSON com o objeto informado.
   */
  writeAll(data: T): void {
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      this.filePath,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  }
}

// Export default para compatibilidade com require()
export default JsonStorage;
