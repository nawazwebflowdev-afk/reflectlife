import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

import { tr } from "@/i18n/tr";
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
            {tr("a.d2ba3687a1")}
          </h1>
          
          <p className="text-muted-foreground text-lg mb-6">
            {tr("a.497b0ec37c")}
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/templates")} 
              size="lg"
              className="w-full"
            >
              {tr("a.32ded662f3")}
            </Button>
            
            <Button 
              onClick={() => navigate("/dashboard")} 
              variant="outline"
              size="lg"
              className="w-full"
            >
              {tr("a.f7b5bf8cef")}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            {tr("a.9460b75b03")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cancel;
