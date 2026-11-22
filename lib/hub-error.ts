export class HubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HubError";
  }
}
