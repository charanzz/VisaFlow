import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { MessageSquarePlus, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const feedbackSchema = z.object({
  message: z.string().min(10, "Feedback must be at least 10 characters").max(1000, "Feedback must be under 1000 characters"),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { message: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: FeedbackForm) => {
      const res = await apiRequest("POST", "/api/feedback", { message: data.message });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit feedback");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
    },
    onError: (e: any) => {
      toast({ title: "Submission Failed", description: e.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Feedback Submitted!</h3>
              <p className="text-sm text-muted-foreground">Thank you for your feedback. We appreciate your input.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitted(false)}
              data-testid="button-submit-another"
            >
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquarePlus className="w-5 h-5 text-blue-300" />
          <h1 className="text-xl font-bold text-black">Submit Feedback</h1>
        </div>
        <p className="text-sm text-black-200/60">
          Share your experience or suggestions to help us improve VisaFlow.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your Feedback</CardTitle>
          <CardDescription>All fields are required. Your details are pulled from your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              {/* Name (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={user?.fullName ?? ""}
                  readOnly
                  disabled
                  className="bg-muted"
                  data-testid="input-feedback-name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                  className="bg-muted"
                  data-testid="input-feedback-email"
                />
              </div>

              {/* Message */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your experience, suggestions, or any issues you encountered..."
                        className="min-h-[140px] resize-none"
                        data-testid="textarea-feedback-message"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {field.value.length}/1000
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={mutation.isPending}
                data-testid="button-submit-feedback"
              >
                <Send className="w-4 h-4" />
                {mutation.isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
