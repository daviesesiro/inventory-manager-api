export default class ConfigNotFoundError extends Error {
  constructor(
    message: string,
    readonly configName: string,
  ) {
    super(message);
    this.name = "ConfigNotFoundError";
  }
}
