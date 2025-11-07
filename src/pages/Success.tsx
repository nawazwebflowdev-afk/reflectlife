import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate("/templates");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-elegant animate-fade-in">
        <CardContent className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <h1 className="font-serif text-3xl font-bold mb-4">
            Thank You for Your Purchase!
          </h1>
          
          <p className="text-muted-foreground text-lg mb-6">
            Your new template is now available in your account. You can start using it to personalize your memorial right away.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/templates")} 
              size="lg"
              className="w-full"
            >
              View My Templates
            </Button>
            
            <Button 
              onClick={() => navigate("/dashboard")} 
              variant="outline"
              size="lg"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            Redirecting to templates in a few seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
