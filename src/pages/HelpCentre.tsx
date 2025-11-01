import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { countries } from "@/data/countries";
import { HelpCircle, Send } from "lucide-react";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  country: z.string().min(1, "Please select a country"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const faqData = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "What is Reflectlife?",
        answer:
          "Reflectlife is a space to celebrate, honor, and remember loved ones who have passed away. You can create memorials, upload photos, and write tributes.",
      },
      {
        question: "How do I create a memorial?",
        answer:
          'Go to "Memorial Wall" and click "Create a Memorial." Upload images, add tributes, and save your memorial.',
      },
    ],
  },
  {
    category: "Managing Your Memorials",
    questions: [
      {
        question: "Can I edit or delete a memorial?",
        answer: "Yes, from your dashboard, you can edit or remove your memorials.",
      },
      {
        question: "Can I make a memorial private?",
        answer: "Toggle the visibility setting in the memorial's edit section.",
      },
    ],
  },
  {
    category: "Templates & Customization",
    questions: [
      {
        question: "What are templates?",
        answer: "Templates personalize the look of your memorial.",
      },
      {
        question: "How can I get new templates?",
        answer:
          "Visit the Templates page — some are free, others are paid via Stripe.",
      },
    ],
  },
  {
    category: "Family & Friendship Trees",
    questions: [
      {
        question: "What is a Family Tree?",
        answer: "A visual connection of loved ones — parents, siblings, and relatives.",
      },
      {
        question: "What is a Friendship Tree?",
        answer: "A web of mentors, friends, and life connections.",
      },
    ],
  },
  {
    category: "Payments & Earnings",
    questions: [
      {
        question: "How do I buy templates?",
        answer: 'Click "Buy Template" and pay securely via card.',
      },
      {
        question: "How do creators get paid?",
        answer:
          "Creators earn automatically when users purchase their templates.",
      },
    ],
  },
  {
    category: "Account & Profile",
    questions: [
      {
        question: "How do I edit my profile?",
        answer: "Go to your dashboard → Edit Profile.",
      },
      {
        question: "How do I delete my account?",
        answer: "Contact support to request deletion.",
      },
    ],
  },
];

const HelpCentre = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      country: "",
      message: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("support_messages")
        .insert([{
          name: values.name,
          email: values.email,
          country: values.country,
          message: values.message,
        }]);

      if (error) throw error;

      toast({
        title: "Message sent successfully",
        description: "Thank you for reaching out. Our support team will get back to you shortly.",
      });

      form.reset();
    } catch (error) {
      console.error("Error submitting support message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-serif text-foreground">
              Help Centre
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions or reach out to our support team
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mb-16 animate-fade-up">
          <h2 className="text-2xl font-serif text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-elegant p-6 border border-border">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqData.map((category, categoryIndex) => (
                <AccordionItem
                  key={categoryIndex}
                  value={`category-${categoryIndex}`}
                  className="border border-border rounded-lg px-4 bg-background/50"
                >
                  <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary">
                    {category.category}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {category.questions.map((item, questionIndex) => (
                        <div
                          key={questionIndex}
                          className="pl-4 border-l-2 border-primary/20"
                        >
                          <p className="font-medium text-foreground mb-2">
                            {item.question}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif text-foreground mb-3">
              Still need help? We're here for you.
            </h2>
            <p className="text-muted-foreground">
              Send us a message and we'll get back to you as soon as possible
            </p>
          </div>

          <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-elegant p-8 border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background max-h-[300px]">
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="How can we help you today?"
                          className="min-h-[150px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full shadow-elegant"
                  disabled={isSubmitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCentre;
