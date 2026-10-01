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
import { HelpCircle, Send, Loader2 } from "lucide-react";

import { tr } from "@/i18n/tr";
const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be less than 255 characters"),
  country: z.string().min(1, "Please select a country"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const faqData = [
  {
    category: "Getting Started",
    questions: [
      {
        question: tr("a.2b4eb3dc4d"),
        answer:
          tr("a.8579ccc197"),
      },
      {
        question: tr("a.210850b6df"),
        answer:
          tr("a.1ce19b1354"),
      },
    ],
  },
  {
    category: "Managing Your Memorials",
    questions: [
      {
        question: tr("a.ba0ebeb85a"),
        answer: tr("a.461f09ac9d"),
      },
      {
        question: tr("a.7338a7540d"),
        answer: tr("a.ff649e4433"),
      },
    ],
  },
  {
    category: "Templates & Customization",
    questions: [
      {
        question: tr("a.3a994773b4"),
        answer: tr("a.ad0fbb5d74"),
      },
      {
        question: tr("a.48cca9aac7"),
        answer:
          tr("a.a4bf4620c0"),
      },
    ],
  },
  {
    category: "Family & Friendship Trees",
    questions: [
      {
        question: tr("a.7ec817b774"),
        answer: tr("a.47f8d86d6c"),
      },
      {
        question: tr("a.196f835ca0"),
        answer: tr("a.863378486a"),
      },
    ],
  },
  {
    category: "Payments & Earnings",
    questions: [
      {
        question: tr("a.43ff8cbfc4"),
        answer: tr("a.618ea1abea"),
      },
      {
        question: tr("a.9d938da604"),
        answer:
          tr("a.9e53b3de5e"),
      },
    ],
  },
  {
    category: "Account & Profile",
    questions: [
      {
        question: tr("a.b60d6428c2"),
        answer: tr("a.f138de98c9"),
      },
      {
        question: tr("a.33e3b64a78"),
        answer: tr("a.1ef4703c54"),
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
      const { error: functionError } = await supabase.functions.invoke("send-help-message", {
        body: {
          name: values.name,
          email: values.email,
          country: values.country,
          message: values.message,
        },
      });

      if (functionError) throw functionError;

      toast({
        title: tr("a.377aaac441"),
        description: tr("a.3aaeb89ffb"),
      });
      form.reset();
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message || tr("a.5b7c984e1e"),
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
              {tr("a.869a36ef46")}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            {tr("a.bd4e3367c3")}
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mb-16 animate-fade-up">
          <h2 className="text-2xl font-serif text-foreground mb-6 text-center">
            {tr("a.d790b402d7")}
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
              {tr("a.b0041bb366")}
            </h2>
            <p className="text-muted-foreground">
              {tr("a.9828c268fa")}
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
                      <FormLabel>{tr("a.709a23220f")}</FormLabel>
                      <FormControl>
                        <Input placeholder={tr("a.d9047642f7")} {...field} />
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
                      <FormLabel>{tr("a.84add5b295")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={tr("a.9b5ca72bb2")}
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
                      <FormLabel>{tr("a.d523ebbd10")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={tr("a.5536b471cb")} />
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
                      <FormLabel>{tr("a.68f4145fee")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={tr("a.0c77d59ab1")}
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
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tr("a.c338c191ab")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {tr("a.6dcd151222")}
                    </>
                  )}
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
