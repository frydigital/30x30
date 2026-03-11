"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Link2,
    Link2Off,
    Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ConnectionClientProps {
    stravaConnected: boolean;
    stravaConfigured: boolean;
}

export default function ConnectionClient({
    stravaConnected,
    stravaConfigured,

}: ConnectionClientProps) {
    const router = useRouter();
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);




    const handleDisconnectStrava = async () => {
        if (!confirm("Are you sure you want to disconnect Strava?")) return;

        setDisconnecting(true);
        setMessage(null);

        try {
            const response = await fetch("/api/strava/disconnect", {
                method: "POST",
            });

            if (response.ok) {
                setMessage({ type: "success", text: "Strava disconnected" });
                router.refresh();
            } else {
                const data = await response.json();
                setMessage({ type: "error", text: data.error });
            }
        } catch {
            setMessage({ type: "error", text: "Failed to disconnect Strava" });
        }
        setDisconnecting(false);
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Data Sources</CardTitle>
                    <CardDescription>
                        Connect fitness platforms
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Strava Connection */}
                    <div className="flex gap-6">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                            </svg>
                            Strava
                        </h3>
                        {stravaConnected ? (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleDisconnectStrava}
                                    disabled={disconnecting}
                                >
                                    {disconnecting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Link2Off className="w-4 h-4 mr-2" />
                                    )}
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button size="sm" asChild disabled={!stravaConfigured}>
                                    <a href="/api/strava/connect">
                                        <Link2 className="w-4 h-4 mr-2" />
                                        Connect Strava
                                    </a>
                                </Button>
                                {!stravaConfigured && (
                                    <p className="text-xs text-muted-foreground">
                                        Strava API credentials not configured
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
                {message && (
                    <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                        {message.text}
                    </div>
                )}
            </Card>
        </>
    )
}