'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Heart, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AuthService } from '@/lib/services/auth';

const MUSIC_GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Jazz', 'Classical', 'Electronic', 'Dance',
  'Country', 'Folk', 'Blues', 'Reggae', 'Metal', 'Punk', 'Indie', 'Alternative',
  'Soul', 'Funk', 'Disco', 'House', 'Techno', 'Dubstep', 'K-Pop', 'Latin',
  'Bollywood', 'Ambient', 'Lo-Fi', 'Acoustic', 'Gospel', 'Opera'
];

/**
 * Account Settings Page
 * Manage profile photo, password, and music interests
 */
export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [interestsMessage, setInterestsMessage] = useState('');
  
  // Language Preferences
  const [languagePriorities, setLanguagePriorities] = useState<string[]>(['English']);
  const [savingLanguages, setSavingLanguages] = useState(false);
  const [languagesMessage, setLanguagesMessage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const authService = AuthService.getInstance();
      const userProfile = await authService.getUserProfile();
      
      if (!userProfile) {
        router.push('/login');
        return;
      }

      setUser(userProfile);
      
      // Load user preferences from backend
      await loadUserPreferences();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const authService = AuthService.getInstance();
      const session = await authService.getSession();
      
      if (!session?.access_token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/user-preferences`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setSelectedInterests(data.preferences.preferred_genres || []);
          setLanguagePriorities(data.preferences.language_priorities || ['English']);
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const authService = AuthService.getInstance();
      const session = await authService.getSession();
      
      if (!session?.access_token) {
        setPasswordMessage('Please login again');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage('✅ Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        setPasswordMessage(`❌ ${error.detail || 'Failed to change password'}`);
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setPasswordMessage('❌ Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleInterest = (genre: string) => {
    setSelectedInterests(prev => 
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    setInterestsMessage('');
    
    try {
      const authService = AuthService.getInstance();
      const session = await authService.getSession();
      
      if (!session?.access_token) {
        setInterestsMessage('Please login again');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/user-preferences/interests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests: selectedInterests,
        }),
      });

      if (response.ok) {
        setInterestsMessage('✅ Interests saved successfully! Your recommendations will be updated.');
        
        // Store in localStorage for quick access
        localStorage.setItem('user_interests', JSON.stringify(selectedInterests));
      } else {
        const error = await response.json();
        setInterestsMessage(`❌ ${error.detail || 'Failed to save interests'}`);
      }
    } catch (error) {
      console.error('Failed to save interests:', error);
      setInterestsMessage('❌ Failed to save interests. Please try again.');
    } finally {
      setSavingInterests(false);
    }
  };

  const moveLanguageUp = (index: number) => {
    if (index > 0) {
      const newPriorities = [...languagePriorities];
      [newPriorities[index - 1], newPriorities[index]] = [newPriorities[index], newPriorities[index - 1]];
      setLanguagePriorities(newPriorities);
    }
  };

  const moveLanguageDown = (index: number) => {
    if (index < languagePriorities.length - 1) {
      const newPriorities = [...languagePriorities];
      [newPriorities[index], newPriorities[index + 1]] = [newPriorities[index + 1], newPriorities[index]];
      setLanguagePriorities(newPriorities);
    }
  };

  const toggleLanguage = (language: string) => {
    if (languagePriorities.includes(language)) {
      // Remove if already selected
      setLanguagePriorities(languagePriorities.filter(l => l !== language));
    } else {
      // Add to end of list
      setLanguagePriorities([...languagePriorities, language]);
    }
  };

  const handleSaveLanguages = async () => {
    setSavingLanguages(true);
    setLanguagesMessage('');
    
    try {
      const authService = AuthService.getInstance();
      const session = await authService.getSession();
      
      if (!session?.access_token) {
        setLanguagesMessage('Please login again');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/user-preferences/languages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language_priorities: languagePriorities,
        }),
      });

      if (response.ok) {
        setLanguagesMessage('✅ Language preferences saved successfully!');
        
        // Store in localStorage for quick access
        localStorage.setItem('user_language_priorities', JSON.stringify(languagePriorities));
      } else {
        const error = await response.json();
        setLanguagesMessage(`❌ ${error.detail || 'Failed to save language preferences'}`);
      }
    } catch (error) {
      console.error('Failed to save language preferences:', error);
      setLanguagesMessage('❌ Failed to save language preferences. Please try again.');
    } finally {
      setSavingLanguages(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading account settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your security and music preferences
        </p>
      </div>

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMessage}
              </p>
            )}
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Language Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Language Preferences
          </CardTitle>
          <CardDescription>
            Set your preferred languages for music recommendations (in priority order)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Available Languages</Label>
            <div className="flex flex-wrap gap-2">
              {['Hindi', 'English', 'Bengali'].map((language) => (
                <Badge
                  key={language}
                  variant={languagePriorities.includes(language) ? 'default' : 'outline'}
                  className="cursor-pointer hover:scale-105 transition-transform px-3 py-1.5"
                  onClick={() => toggleLanguage(language)}
                >
                  {language}
                </Badge>
              ))}
            </div>
          </div>

          {languagePriorities.length > 0 && (
            <div className="space-y-3">
              <Label>Priority Order (Higher = More Preferred)</Label>
              <div className="space-y-2">
                {languagePriorities.map((language, index) => (
                  <div
                    key={language}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 font-medium">{language}</div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLanguageUp(index)}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLanguageDown(index)}
                        disabled={index === languagePriorities.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLanguage(language)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Songs in {languagePriorities[0]} will be prioritized in recommendations
              </p>
            </div>
          )}

          {languagesMessage && (
            <p className={`text-sm ${languagesMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {languagesMessage}
            </p>
          )}
          <Button 
            onClick={handleSaveLanguages} 
            disabled={savingLanguages || languagePriorities.length === 0}
          >
            {savingLanguages ? 'Saving...' : 'Save Language Preferences'}
          </Button>
        </CardContent>
      </Card>

      {/* Music Interests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Music Interests
          </CardTitle>
          <CardDescription>
            Select your favorite genres to get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MUSIC_GENRES.map((genre) => (
              <Badge
                key={genre}
                variant={selectedInterests.includes(genre) ? 'default' : 'outline'}
                className="cursor-pointer hover:scale-105 transition-transform px-3 py-1.5"
                onClick={() => toggleInterest(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
          {selectedInterests.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Selected {selectedInterests.length} genre{selectedInterests.length !== 1 ? 's' : ''}
            </p>
          )}
          {interestsMessage && (
            <p className={`text-sm ${interestsMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {interestsMessage}
            </p>
          )}
          <Button 
            onClick={handleSaveInterests} 
            disabled={savingInterests || selectedInterests.length === 0}
          >
            {savingInterests ? 'Saving...' : 'Save Interests'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
