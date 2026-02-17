'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, Save, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProfileDraft {
  name?: string;
  roleType?: string;
  seniority?: string;
  description?: string;
  techStack?: string[];
  evaluationDimensions?: { key: string; label: string; weight: number }[];
  interviewStructure?: {
    totalDuration: number;
    phases: {
      name: string;
      duration: number;
      questions: { text: string; listenFor?: string; note?: string }[];
    }[];
  };
  analysisInstructions?: string;
  redFlags?: string[];
  greenFlags?: string[];
}

export default function NewProfilePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! Let's build your interview plan together. What role are you hiring for?",
    },
  ]);
  const [input, setInput] = useState('');
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({});
  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/profiles/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          profileDraft,
          step,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      setProfileDraft(data.profileDraft);
      setStep(data.step);
      setIsComplete(data.complete);
    } catch (error) {
      console.error('Send message error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDraft),
      });

      if (!response.ok) throw new Error('Failed to save profile');

      const { profile } = await response.json();
      router.push('/dashboard/profiles');
    } catch (error) {
      console.error('Save profile error:', error);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-400" />
            Build Interview Profile
          </h1>
          <p className="text-gray-400">Let's create a structured interview plan together</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Panel */}
          <div className="bg-[#111118] border border-gray-800 rounded-xl flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-semibold">Conversation</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-100'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-lg px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  disabled={isLoading || isComplete}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim() || isComplete}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-[#111118] border border-gray-800 rounded-xl p-6 h-[calc(100vh-200px)] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Profile Preview</h2>
              {isComplete && (
                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Template
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              {profileDraft.name && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Role</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className="font-medium">{profileDraft.name}</p>
                    {profileDraft.seniority && (
                      <p className="text-sm text-gray-400 mt-1">{profileDraft.seniority} level</p>
                    )}
                    {profileDraft.description && (
                      <p className="text-sm text-gray-300 mt-2">{profileDraft.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tech Stack */}
              {profileDraft.techStack && profileDraft.techStack.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileDraft.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1 rounded-full text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluation Dimensions */}
              {profileDraft.evaluationDimensions && profileDraft.evaluationDimensions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Evaluation Dimensions</h3>
                  <div className="space-y-2">
                    {profileDraft.evaluationDimensions.map((dim, idx) => (
                      <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{dim.label}</span>
                          <span className="text-xs text-purple-400 font-semibold">
                            {(dim.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{ width: `${dim.weight * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flags */}
              {((profileDraft.redFlags && profileDraft.redFlags.length > 0) ||
                (profileDraft.greenFlags && profileDraft.greenFlags.length > 0)) && (
                <div className="grid grid-cols-2 gap-4">
                  {profileDraft.redFlags && profileDraft.redFlags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-400 mb-2">Red Flags</h3>
                      <ul className="space-y-1">
                        {profileDraft.redFlags.map((flag, idx) => (
                          <li key={idx} className="text-xs text-gray-400 flex items-start gap-1">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {profileDraft.greenFlags && profileDraft.greenFlags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">Green Flags</h3>
                      <ul className="space-y-1">
                        {profileDraft.greenFlags.map((flag, idx) => (
                          <li key={idx} className="text-xs text-gray-400 flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Interview Structure */}
              {profileDraft.interviewStructure && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    Interview Structure ({profileDraft.interviewStructure.totalDuration} min)
                  </h3>
                  <div className="space-y-3">
                    {profileDraft.interviewStructure.phases.map((phase, idx) => (
                      <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">{phase.name}</span>
                          <span className="text-xs text-gray-500">{phase.duration} min</span>
                        </div>
                        <ul className="space-y-1 pl-3">
                          {phase.questions.map((q, qIdx) => (
                            <li key={qIdx} className="text-xs text-gray-400">
                              • {q.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Instructions */}
              {profileDraft.analysisInstructions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Analysis Focus</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-300">{profileDraft.analysisInstructions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
