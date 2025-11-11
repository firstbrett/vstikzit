class FullParseError extends Error {
  public offset: number;
  constructor(message: string, offset: number) {
    super(message);
    this.offset = offset;
  }
}

export { FullParseError };

