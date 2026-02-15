import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../page";
import type { OutfitAnalysis } from "@/lib/schemas/analysis";

const MOCK_ANALYSIS: OutfitAnalysis = {
  colorHarmony: {
    score: 8,
    summary: "Great coordination",
    details: "Colors complement each other well",
    suggestions: ["Try a warmer scarf"],
  },
  fit: {
    score: 7,
    summary: "Good fit overall",
    details: "Well-tailored pieces",
    suggestions: ["Slimmer cut on pants"],
  },
  occasionAppropriateness: {
    score: 8,
    summary: "Versatile outfit",
    suitableOccasions: ["casual", "brunch"],
    unsuitableOccasions: ["formal gala"],
    details: "Works for casual settings",
    suggestions: [],
  },
  accessories: {
    score: 6,
    summary: "Minimal accessories",
    details: "Could use more accessories",
    suggestions: ["Add a watch"],
  },
  overallAssessment: {
    score: 7,
    summary: "Solid casual look",
    details: "Well-put-together outfit",
    suggestions: ["Complete with accessories"],
    strengths: ["Color coordination"],
    areasForImprovement: ["Accessories"],
    styleProfile: "Casual Minimalist",
  },
};

function createMockFile(
  name = "outfit.jpg",
  size = 1024,
  type = "image/jpeg"
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function mockFileReaderSuccess(dataUrl = "data:image/jpeg;base64,abc123") {
  const mockReader = {
    readAsDataURL: jest.fn(),
    result: dataUrl,
    onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
    onerror: null as ((e: ProgressEvent<FileReader>) => void) | null,
  };

  jest.spyOn(window, "FileReader").mockImplementation(() => {
    const reader = mockReader as unknown as FileReader;
    setTimeout(() => {
      if (mockReader.onload) {
        mockReader.onload({
          target: { result: dataUrl },
        } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
    return reader;
  });

  return mockReader;
}

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("Upload State", () => {
    it("renders the upload heading", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /ai fashion advisor/i })
      ).toBeInTheDocument();
    });

    it("renders a file input that accepts images", () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      expect(input).toHaveAttribute("type", "file");
      expect(input).toHaveAttribute("accept");
    });

    it("shows accepted formats info", () => {
      render(<Home />);
      expect(screen.getByText(/jpg/i)).toBeInTheDocument();
    });
  });

  describe("File Validation", () => {
    it("shows error for files exceeding 4MB", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      const largeFile = createMockFile(
        "big.jpg",
        5 * 1024 * 1024,
        "image/jpeg"
      );

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/too large|4MB/i);
      });
    });

    it("shows error for non-image files", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      const textFile = createMockFile("doc.txt", 1024, "text/plain");

      fireEvent.change(input, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          /unsupported|image/i
        );
      });
    });
  });

  describe("Preview State", () => {
    beforeEach(() => {
      mockFileReaderSuccess();
    });

    it("shows the uploaded image after file selection", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });
    });

    it("shows an analyze button to confirm submission", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /analyze outfit/i })
        ).toBeInTheDocument();
      });
    });

    it("shows a button to choose a different photo", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /choose different/i })
        ).toBeInTheDocument();
      });
    });

    it("does not call the API until the user confirms", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("goes back to idle when choosing a different photo", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /choose different/i })
      );

      expect(screen.getByLabelText(/upload/i)).toBeInTheDocument();
      expect(screen.queryByAltText(/preview/i)).not.toBeInTheDocument();
    });

    it("shows occasion input in preview state", async () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      expect(
        screen.getByLabelText(/where are you going/i)
      ).toBeInTheDocument();
    });

    it("transitions to loading when user confirms", async () => {
      mockFetch.mockReturnValue(new Promise(() => {}));

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("shows loading indicator during analysis", async () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
      mockFileReaderSuccess();

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
      });
    });
  });

  describe("Results State", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });
      mockFileReaderSuccess();
    });

    async function uploadConfirmAndWaitForResults() {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );
    }

    it("displays all five analysis categories", async () => {
      await uploadConfirmAndWaitForResults();

      await waitFor(() => {
        expect(screen.getByText("Color Harmony")).toBeInTheDocument();
        expect(screen.getByText("Fit")).toBeInTheDocument();
        expect(screen.getByText("Occasion Appropriateness")).toBeInTheDocument();
        expect(screen.getByText("Accessories")).toBeInTheDocument();
        expect(screen.getByText("Overall Assessment")).toBeInTheDocument();
      });
    });

    it("shows the style profile", async () => {
      await uploadConfirmAndWaitForResults();

      await waitFor(() => {
        expect(screen.getByText(/casual minimalist/i)).toBeInTheDocument();
      });
    });

    it("allows analyzing another image via reset button", async () => {
      await uploadConfirmAndWaitForResults();

      await waitFor(() => {
        expect(screen.getByText(/casual minimalist/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze another/i })
      );

      expect(screen.getByLabelText(/upload/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/casual minimalist/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Occasion Input", () => {
    it("renders an occasion text input in the preview state", async () => {
      mockFileReaderSuccess();

      render(<Home />);
      const fileInput = screen.getByLabelText(/upload/i);
      fireEvent.change(fileInput, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      expect(
        screen.getByLabelText(/where are you going/i)
      ).toBeInTheDocument();
    });

    it("sends occasion to the API when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });
      mockFileReaderSuccess();

      render(<Home />);
      const fileInput = screen.getByLabelText(/upload/i);
      fireEvent.change(fileInput, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      const occasionInput = screen.getByLabelText(/where are you going/i);
      fireEvent.change(occasionInput, { target: { value: "job interview" } });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.occasion).toBe("job interview");
    });

    it("sends request without occasion when field is empty", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });
      mockFileReaderSuccess();

      render(<Home />);
      const fileInput = screen.getByLabelText(/upload/i);
      fireEvent.change(fileInput, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.occasion).toBeUndefined();
    });

    it("clears occasion input on reset", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });
      mockFileReaderSuccess();

      render(<Home />);
      const fileInput = screen.getByLabelText(/upload/i);
      fireEvent.change(fileInput, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      const occasionInput = screen.getByLabelText(/where are you going/i);
      fireEvent.change(occasionInput, { target: { value: "wedding" } });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/casual minimalist/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze another/i })
      );

      // Back to idle, then upload again to see preview with occasion
      const newFileInput = screen.getByLabelText(/upload/i);
      fireEvent.change(newFileInput, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/where are you going/i)).toHaveValue("");
    });
  });

  describe("Error State", () => {
    it("displays error message on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Analysis failed" }),
      });
      mockFileReaderSuccess();

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("allows retrying after an error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Analysis failed" }),
      });
      mockFileReaderSuccess();

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      expect(screen.getByLabelText(/upload/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Follow-up Context", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });
      mockFileReaderSuccess();
    });

    async function uploadAndWaitForResults() {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/casual minimalist/i)).toBeInTheDocument();
      });
    }

    it("shows a follow-up context input on the results screen", async () => {
      await uploadAndWaitForResults();

      expect(
        screen.getByLabelText(/add more context|follow-up|additional/i)
      ).toBeInTheDocument();
    });

    it("shows an update analysis button on the results screen", async () => {
      await uploadAndWaitForResults();

      expect(
        screen.getByRole("button", { name: /update analysis/i })
      ).toBeInTheDocument();
    });

    it("sends image with additionalContext to API when follow-up is submitted", async () => {
      await uploadAndWaitForResults();
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...MOCK_ANALYSIS,
          overallAssessment: {
            ...MOCK_ANALYSIS.overallAssessment,
            styleProfile: "Updated Profile",
          },
        }),
      });

      const followUpInput = screen.getByLabelText(
        /add more context|follow-up|additional/i
      );
      fireEvent.change(followUpInput, {
        target: { value: "I plan to wear different shoes" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.image).toBeDefined();
      expect(fetchBody.additionalContext).toBe(
        "I plan to wear different shoes"
      );
    });

    it("preserves the occasion when sending follow-up", async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });
      mockFileReaderSuccess();

      render(<Home />);
      const fileInput = screen.getByLabelText(/upload/i);
      fireEvent.change(fileInput, {
        target: { files: [createMockFile()] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      const occasionInput = screen.getByLabelText(/where are you going/i);
      fireEvent.change(occasionInput, { target: { value: "wedding" } });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/casual minimalist/i)).toBeInTheDocument();
      });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });

      const followUpInput = screen.getByLabelText(
        /add more context|follow-up|additional/i
      );
      fireEvent.change(followUpInput, {
        target: { value: "outdoor ceremony" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.occasion).toBe("wedding");
      expect(fetchBody.additionalContext).toBe("outdoor ceremony");
    });

    it("shows loading state during follow-up analysis", async () => {
      await uploadAndWaitForResults();
      mockFetch.mockClear();
      mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

      const followUpInput = screen.getByLabelText(
        /add more context|follow-up|additional/i
      );
      fireEvent.change(followUpInput, {
        target: { value: "more context" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
      });
    });

    it("displays updated results after follow-up", async () => {
      await uploadAndWaitForResults();
      mockFetch.mockClear();

      const updatedAnalysis = {
        ...MOCK_ANALYSIS,
        overallAssessment: {
          ...MOCK_ANALYSIS.overallAssessment,
          styleProfile: "Elegant Formal",
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => updatedAnalysis,
      });

      const followUpInput = screen.getByLabelText(
        /add more context|follow-up|additional/i
      );
      fireEvent.change(followUpInput, {
        target: { value: "attending a gala" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/elegant formal/i)).toBeInTheDocument();
      });
    });

    it("keeps the image visible after follow-up analysis", async () => {
      await uploadAndWaitForResults();

      expect(screen.getByAltText(/outfit/i)).toBeInTheDocument();

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });

      const followUpInput = screen.getByLabelText(
        /add more context|follow-up|additional/i
      );
      fireEvent.change(followUpInput, {
        target: { value: "more context" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/casual minimalist/i)).toBeInTheDocument();
      });

      expect(screen.getByAltText(/outfit/i)).toBeInTheDocument();
    });

    it("does not send follow-up when additionalContext is empty", async () => {
      await uploadAndWaitForResults();
      mockFetch.mockClear();

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("shows error when follow-up API call fails", async () => {
      await uploadAndWaitForResults();
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Follow-up failed" }),
      });

      const followUpInput = screen.getByLabelText(
        /add more context|follow-up|additional/i
      );
      fireEvent.change(followUpInput, {
        target: { value: "some context" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /update analysis/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/follow-up failed/i);
      });
    });
  });

  describe("HEIC Support", () => {
    it("accepts HEIC files in the file input", () => {
      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      const accept = input.getAttribute("accept");
      expect(accept).toContain(".heic");
      expect(accept).toContain(".heif");
    });

    it("calls the convert API for HEIC files", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ image: "data:image/jpeg;base64,converted-jpg" }),
      });
      mockFileReaderSuccess("data:image/heic;base64,heic-data");

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile("photo.heic", 1024, "image/heic")] },
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/convert");
      const fetchBody = JSON.parse(options.body);
      expect(fetchBody.image).toBe("data:image/heic;base64,heic-data");
    });

    it("shows preview with converted JPEG after HEIC conversion", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ image: "data:image/jpeg;base64,converted-jpg" }),
      });
      mockFileReaderSuccess("data:image/heic;base64,heic-data");

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile("photo.heic", 1024, "image/heic")] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      const previewImg = screen.getByAltText(/preview/i) as HTMLImageElement;
      expect(previewImg.src).toContain("data:image/jpeg;base64,converted-jpg");
    });

    it("sends converted JPEG to analyze API (not HEIC)", async () => {
      // First call: convert API returns JPEG
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ image: "data:image/jpeg;base64,converted-jpg" }),
      });
      mockFileReaderSuccess("data:image/heic;base64,heic-data");

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile("photo.heic", 1024, "image/heic")] },
      });

      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      // Second call: analyze API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ANALYSIS,
      });

      fireEvent.click(
        screen.getByRole("button", { name: /analyze outfit/i })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      const [analyzeUrl, analyzeOptions] = mockFetch.mock.calls[1];
      expect(analyzeUrl).toBe("/api/analyze");
      const analyzeBody = JSON.parse(analyzeOptions.body);
      expect(analyzeBody.image).toBe("data:image/jpeg;base64,converted-jpg");
    });

    it("shows error when HEIC conversion fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Conversion failed" }),
      });
      mockFileReaderSuccess("data:image/heic;base64,heic-data");

      render(<Home />);
      const input = screen.getByLabelText(/upload/i);
      fireEvent.change(input, {
        target: { files: [createMockFile("photo.heic", 1024, "image/heic")] },
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/conversion failed/i);
      });
    });

    it("shows HEIC in accepted formats info", () => {
      render(<Home />);
      expect(screen.getByText(/heic/i)).toBeInTheDocument();
    });
  });
});