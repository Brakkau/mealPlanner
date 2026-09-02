import { connect, type TLSSocket } from "tls";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

function extractAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7e]+$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): string {
  const boundary = `mp_${Date.now().toString(16)}`;
  const normalizedText = params.text.replace(/\r?\n/g, "\r\n");
  const normalizedHtml = params.html.replace(/\r?\n/g, "\r\n");

  return [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizedText,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizedHtml,
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

class SmtpSession {
  private buffer = "";
  private waiters: Array<{
    expectedCode: number;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private socket: TLSSocket) {
    socket.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8");
      this.flush();
    });
  }

  private flush(): void {
    const waiter = this.waiters[0];
    if (!waiter) return;

    const lines = this.buffer.split(/\r?\n/);
    for (const line of lines) {
      if (/^\d{3} /.test(line)) {
        this.buffer = "";
        this.waiters.shift();
        const code = Number(line.slice(0, 3));
        if (code !== waiter.expectedCode) {
          waiter.reject(new Error(`SMTP ${waiter.expectedCode} expected, got ${line.trim()}`));
          return;
        }
        waiter.resolve(line.trim());
        return;
      }
    }
  }

  async expect(expectedCode: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ expectedCode, resolve, reject });
      this.flush();
    });
  }

  async command(command: string, expectedCode: number): Promise<string> {
    this.socket.write(`${command}\r\n`);
    return this.expect(expectedCode);
  }

  writeRaw(data: string): void {
    this.socket.write(data);
  }

  end(): void {
    this.socket.end();
  }
}

export async function sendSmtpMail(params: {
  config: SmtpConfig;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const socket = connect({
    host: params.config.host,
    port: params.config.port,
    servername: params.config.host
  });

  const session = new SmtpSession(socket);

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", () => resolve());
      socket.once("error", reject);
    });

    await session.expect(220);
    await session.command(`EHLO ${params.config.host}`, 250);
    await session.command("AUTH LOGIN", 334);
    await session.command(Buffer.from(params.config.user, "utf8").toString("base64"), 334);
    await session.command(Buffer.from(params.config.pass, "utf8").toString("base64"), 235);
    await session.command(`MAIL FROM:<${extractAddress(params.from)}>`, 250);
    await session.command(`RCPT TO:<${extractAddress(params.to)}>`, 250);
    await session.command("DATA", 354);

    const mime = buildMimeMessage(params).replace(/^\./gm, "..");
    session.writeRaw(`${mime}\r\n.\r\n`);
    await session.expect(250);
    await session.command("QUIT", 221).catch(() => undefined);
  } finally {
    session.end();
  }
}
