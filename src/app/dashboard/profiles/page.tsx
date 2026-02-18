'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Calendar, Hash, Sparkles, Loader2 } from 'lucide-react';
import type { InterviewProfile } from '@/lib/db/schema';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<InterviewProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles');
      if (!response.ok) throw new Error('Failed to fetch profiles');
      const data = await response.json();
      setProfiles(data.profiles);
    } catch (error) {
      console.error('Fetch profiles error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProfile = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete profile');

      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Delete profile error:', error);
      alert('Failed to delete profile');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="text-foreground">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-400" />
              Interview Profiles
            </h1>
            <p className="text-muted-foreground">Reusable templates for different roles</p>
          </div>
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link href="/dashboard/profiles/new">
              <Plus className="h-5 w-5" />
              New Profile
            </Link>
          </Button>
        </div>

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No profiles yet</h3>
              <p className="text-muted-foreground/70 mb-6">
                Create your first interview profile to get started
              </p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/dashboard/profiles/new">
                  <Plus className="h-5 w-5" />
                  Create Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className="hover:border-purple-500/50 transition-all group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 text-foreground">{profile.name}</h3>
                      {profile.seniority && (
                        <p className="text-sm text-muted-foreground">{profile.seniority} level</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={deletingId === profile.id}
                          className="text-muted-foreground/50 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          {deletingId === profile.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the profile.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteProfile(profile.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{profile.description}</p>

                  <div className="space-y-2">
                    {profile.techStack && profile.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {profile.techStack.slice(0, 3).map((tech, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-blue-600/20 text-blue-400 border-blue-600/30"
                          >
                            {tech}
                          </Badge>
                        ))}
                        {profile.techStack.length > 3 && (
                          <span className="text-xs text-muted-foreground px-2 py-0.5">
                            +{profile.techStack.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {profile.evaluationDimensions && profile.evaluationDimensions.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {profile.evaluationDimensions.length} evaluation dimensions
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex-col gap-4">
                  <div className="flex items-center justify-between w-full pt-4 border-t border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Used {profile.usageCount || 0} times
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <Button variant="secondary" asChild className="w-full">
                    <Link href={`/dashboard/profiles/${profile.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
