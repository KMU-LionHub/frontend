import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { apiRequest } from "./apiClient";
import {
  correctTranscriptionWord,
  createTranscription,
  rerecordTranscription,
} from "./transcriptionApi";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("transcriptionApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({});
  });

  it("uploads a new recording", async () => {
    const audioBlob = new Blob(
      ["audio"],
      {
        type: "audio/webm",
      }
    );

    await createTranscription(audioBlob);

    const [path, options] =
      apiRequest.mock.calls[0];
    const audio = options.body.get(
      "audio"
    );

    expect(path).toBe(
      "/api/stt/transcriptions"
    );
    expect(options.method).toBe("POST");
    expect(audio.name).toBe(
      "recording.webm"
    );
  });

  it("patches a specific transcript word", async () => {
    await correctTranscriptionWord({
      transcriptionId: 21,
      wordId: 12,
      text: "의사소통",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/stt/transcriptions/21/words/12",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          text: "의사소통",
        }),
      })
    );
  });

  it("uploads a replacement recording", async () => {
    const audioBlob = new Blob(
      ["audio"],
      {
        type: "audio/mp4",
      }
    );

    await rerecordTranscription({
      transcriptionId: 21,
      audioBlob,
    });

    const [path, options] =
      apiRequest.mock.calls[0];
    const audio = options.body.get(
      "audio"
    );

    expect(path).toBe(
      "/api/stt/transcriptions/21/re-record"
    );
    expect(audio.name).toBe(
      "recording.m4a"
    );
  });
});
