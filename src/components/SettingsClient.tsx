'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast, Toaster } from 'sonner';
import { Save, Loader2, User as UserIcon } from 'lucide-react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SettingsData {
    userId: string;
    emailRecipients?: string[]; // Legacy
    userName?: string;
    userEmail?: string;
    userAvatar?: string;
    emailFrequency: string;
    emailStyle: string;
    includeTldr: boolean;
    organizationId: string;
}

export default function SettingsClient({ user }: { user: any }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [emailFrequency, setEmailFrequency] = useState('weekly');
    const [emailStyle, setEmailStyle] = useState('informative');
    const [includeTldr, setIncludeTldr] = useState(true);
    const [organizationId, setOrganizationId] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data: SettingsData = await res.json();
                setOrganizationId(data.organizationId);
                setEmailFrequency(data.emailFrequency || 'weekly');
                setEmailStyle(data.emailStyle || 'informative');
                setIncludeTldr(data.includeTldr !== undefined ? data.includeTldr : true);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    emailFrequency,
                    emailStyle,
                    includeTldr
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to save settings');
            }
            
            toast.success('Preferences saved successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
            console.error('Save error details:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background p-6 md:p-10 relative overflow-y-auto w-full">
            <header className="mb-8">
                 <Breadcrumb className="mb-2">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                         <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Settings</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Settings</h1>
                <p className="text-muted-foreground mt-1 text-base">Manage your personal preferences for {organizationId || 'your organization'}.</p>
            </header>

            <div className="max-w-4xl space-y-6">
                {/* User Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>User Profile</CardTitle>
                        <CardDescription>
                            Your notifications will be sent to this account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                            {user.picture ? (
                                <img src={user.picture} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{user.given_name} {user.family_name}</h3>
                            <p className="text-muted-foreground">{user.email}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Report Preferences</CardTitle>
                        <CardDescription>
                            Customize the content and style of your reports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         {/* Frequency */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select value={emailFrequency} onValueChange={setEmailFrequency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">How often you want to receive reports.</p>
                            </div>
                            
                            {/* Style */}
                            <div className="space-y-2">
                                <Label>Email Style</Label>
                                <Select value={emailStyle} onValueChange={setEmailStyle}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="informative">Informative</SelectItem>
                                        <SelectItem value="chatty">Chatty</SelectItem>
                                        <SelectItem value="minimalistic">Minimalistic</SelectItem>
                                        <SelectItem value="techy">Techy</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">The tone and format of the AI-generated summary.</p>
                            </div>
                         </div>

                         {/* TL;DR Toggle */}
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Include TL;DR</Label>
                                <p className="text-sm text-muted-foreground">
                                    Add a "Too Long; Didn't Read" summary at the top of the email.
                                </p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIncludeTldr(!includeTldr)}
                                className={`
                                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                                    ${includeTldr ? 'bg-primary' : 'bg-input'}
                                `}
                            >
                                <span
                                    className={`
                                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out
                                        ${includeTldr ? 'translate-x-5' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                         </div>
                    </CardContent>
                </Card>

                 <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[150px]">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Preferences
                            </>
                        )}
                    </Button>
                </div>
            </div>
            <Toaster />
        </main>
    );
}
