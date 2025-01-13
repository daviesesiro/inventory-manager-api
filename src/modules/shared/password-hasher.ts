import { Inject, Service } from "typedi";
import crypto from "crypto";
import { Logger } from "pino";

@Service()
export default class PasswordHasher {
  private iterations: number;
  private keyLength: number;
  private digest: string;
  private saltLength: number;

  constructor(@Inject("logger") private logger: Logger) {
    this.iterations = 310000;
    this.keyLength = 64;
    this.digest = "sha512";
    this.saltLength = 32;
  }

  /**
   * Hash a password with a randomly generated salt.
   * @param value The value to hash
   * @returns A string containing the salt and hashed password
   */
  public hash(value: string): string {
    const salt = crypto.randomBytes(this.saltLength).toString("hex");
    const hashedPassword = crypto
      .pbkdf2Sync(value, salt, this.iterations, this.keyLength, this.digest)
      .toString("hex");

    return `${salt}:${hashedPassword}`;
  }

  /**
   * Compare a password with a stored hash.
   * @param value The password to verify
   * @param storedHash The stored hash in format `salt:hash`
   * @returns True if the password matches, otherwise false
   */
  public compare(value: string, storedHash: string): boolean {
    if (!value || !storedHash) {
      this.logger.error({
        msg: "invalid hasher compare parameters",
        value: !!value,
        storedHash: !!storedHash
      });
      return false;
    }

    const [salt, hash] = storedHash.split(":");
    const derivedHash = crypto
      .pbkdf2Sync(value, salt, this.iterations, this.keyLength, this.digest)
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(derivedHash, "hex"),
    );
  }
}
