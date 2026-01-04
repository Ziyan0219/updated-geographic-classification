/**
 * PublicSource Geographic Classification Tool - Main Page
 * Design: Swiss Modernism - Precision & Clarity
 * Layout: Asymmetric two-column (30% input / 70% results)
 * Typography: IBM Plex Sans with systematic hierarchy
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, MapPin, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AnalysisResult {
  scope: string;
  areas: Array<{
    name: string;
    region: string;
    context: string;
  }>;
  summary: string;
  confidence: string;
  notes: string;
}

export default function Home() {
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = trpc.geographic.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Analysis complete");
    },
    onError: (error) => {
      toast.error(error.message || "Analysis failed");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
        toast.error('Invalid file type. Please upload .txt or .docx files.');
        return;
      }
      setSelectedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleAnalyze = async () => {
    let textToAnalyze = "";

    // Get text content based on input mode
    if (inputMode === "text") {
      if (!textInput.trim()) {
        toast.error("Please enter text to analyze");
        return;
      }
      textToAnalyze = textInput;
    } else {
      if (!selectedFile) {
        toast.error("Please select a file to analyze");
        return;
      }
      
      // Read file content
      try {
        const reader = new FileReader();
        textToAnalyze = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
              reject(new Error('Failed to read file content'));
              return;
            }
            resolve(text);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(selectedFile);
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to read file");
        return;
      }
    }

    // Call backend API
    analyzeMutation.mutate({ text: textToAnalyze });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Swiss style with minimal decoration */}
      <header className="border-b divider-hairline">
        <div className="container py-8">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">Geographic Classification Tool</h1>
              <p className="text-sm text-muted-foreground mt-1">PublicSource Pittsburgh Local News</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Asymmetric two-column layout */}
      <main className="container py-12">
        <div className="grid lg:grid-cols-[35%_1fr] gap-8">
          {/* Left Column - Input Controls (30-35%) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-[22px] font-semibold mb-2">Input</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload a document or paste article text to identify geographic areas and neighborhoods in Pittsburgh region.
              </p>
            </div>

            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "file")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="w-4 h-4" />
                  File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4 space-y-4">
                <Textarea
                  placeholder="Paste your article text here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[320px] font-sans text-sm leading-relaxed"
                />
              </TabsContent>

              <TabsContent value="file" className="mt-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium mb-1">Upload Document</p>
                    <p className="text-sm text-muted-foreground">
                      Supports .txt, .docx files
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Select File
                  </Button>
                  {selectedFile && (
                    <p className="text-sm text-primary font-medium mt-2">
                      {selectedFile.name}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Geographic Areas"
              )}
            </Button>
          </div>

          {/* Right Column - Results Display (65-70%) */}
          <div>
            {result ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[22px] font-semibold mb-2">Analysis Report</h2>
                  <p className="text-sm text-muted-foreground">
                    Geographic classification results for Pittsburgh region
                  </p>
                </div>

                {/* Geographic Scope */}
                <Card className="p-6">
                  <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Geographic Scope
                  </h3>
                  <p className="text-lg font-medium">{result.scope}</p>
                </Card>

                {/* Identified Areas Table */}
                <Card className="p-6">
                  <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                    Identified Areas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full data-table">
                      <thead>
                        <tr className="border-b divider-hairline">
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Neighborhood/Municipality
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Region
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Context
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.areas.map((area, index) => (
                          <tr key={index} className="border-b divider-hairline last:border-0">
                            <td className="py-3 px-4 font-medium">{area.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{area.region}</td>
                            <td className="py-3 px-4 text-sm leading-relaxed">{area.context}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Analysis Summary */}
                <Card className="p-6">
                  <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Analysis Summary
                  </h3>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </Card>

                {/* Confidence & Notes */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      Confidence Level
                    </h3>
                    <p className="text-lg font-medium">{result.confidence}</p>
                  </Card>

                  {result.notes && (
                    <Card className="p-6">
                      <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Additional Notes
                      </h3>
                      <p className="text-sm leading-relaxed">{result.notes}</p>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground/40" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload a document or enter article text, then click "Analyze" to identify geographic areas and neighborhoods in the Pittsburgh region.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t divider-hairline mt-16">
        <div className="container py-6">
          <p className="text-sm text-muted-foreground text-center">
            © 2025 PublicSource. Geographic Classification Tool for Pittsburgh Local News.
          </p>
        </div>
      </footer>
    </div>
  );
}
