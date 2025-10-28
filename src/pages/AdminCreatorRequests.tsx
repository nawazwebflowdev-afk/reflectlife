import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface CreatorApplication {
  id: string;
  user_id: string;
  display_name: string;
  country: string;
  portfolio: string | null;
  description: string | null;
  approved: boolean;
  created_at: string;
  profiles?: {
    email: string;
  };
}

const AdminCreatorRequests = () => {
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    fetchApplications();
  };

  const fetchApplications = async () => {
    setLoading(true);
    const { data: creators, error } = await supabase
      .from("template_creators")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch email for each creator
    const applicationsWithEmail = await Promise.all(
      (creators || []).map(async (creator) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", creator.user_id)
          .single();

        return {
          ...creator,
          profiles: profile || { email: "N/A" },
        };
      })
    );

    setApplications(applicationsWithEmail);
    setLoading(false);
  };

  const handleApprove = async (applicationId: string, userId: string) => {
    const { error } = await supabase
      .from("template_creators")
      .update({ approved: true })
      .eq("id", applicationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve creator",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User approved as creator",
      });
      fetchApplications();
    }
  };

  const handleReject = async (applicationId: string) => {
    const { error } = await supabase
      .from("template_creators")
      .delete()
      .eq("id", applicationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Application rejected",
      });
      fetchApplications();
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Creator Applications</h1>
            <p className="text-muted-foreground">Review and approve creator applications</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No applications found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-serif text-xl mb-2">
                          {app.display_name}
                        </CardTitle>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Email: {app.profiles?.email || "N/A"}</p>
                          <p>Country: {app.country}</p>
                          {app.portfolio && (
                            <p>
                              Portfolio:{" "}
                              <a
                                href={app.portfolio}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {app.portfolio}
                              </a>
                            </p>
                          )}
                          <p>Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant={app.approved ? "default" : "secondary"}>
                        {app.approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {app.description && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Motivation:</h4>
                        <p className="text-sm text-muted-foreground">{app.description}</p>
                      </div>
                    )}
                    
                    {!app.approved && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(app.id, app.user_id)}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(app.id)}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminCreatorRequests;
