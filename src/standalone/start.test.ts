import { getBootstrapReadyMessage } from "./start";

describe("standalone bootstrap messaging", () => {
  it("does not advertise interactive commands before a CLI exists", () => {
    const message = getBootstrapReadyMessage();

    expect(message).toContain("bootstrap");
    expect(message).toContain("interactive CLI not implemented yet");
    expect(message).not.toContain('type "help"');
    expect(message).not.toContain("for commands");
  });
});
