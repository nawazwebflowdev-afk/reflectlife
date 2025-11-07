import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const Cancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-elegant animate-fade-in">
        <CardContent className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>
          
          <h1 className="font-serif text-3xl font-bold mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-muted-foreground text-lg mb-6">
            Your payment was not completed. Don't worry, you haven't been charged. 
            Feel free to try again whenever you're ready.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/templates")} 
              size="lg"
              className="w-full"
            >
              Back to Templates
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
            Need help? Contact our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cancel;
