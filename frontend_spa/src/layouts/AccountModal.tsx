import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Settings, LogOut, CheckCircle2, Edit2, X, Save, Loader2 } from 'lucide-react';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any; // Basic user info passed from AppSidebar
    theme: string;
    activeConfig: any; // Theme styles from AppSidebar
}

export function AccountModal({ isOpen, onClose, user, theme, activeConfig }: AccountModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Default values if not in firestore yet
    const baseName = user?.displayName || 'User';
    const baseEmail = user?.email || '';

    const [profile, setProfile] = useState({
        fullName: baseName,
        email: baseEmail,
        university: '',
        major: '',
        thesisTitle: '',
    });

    // Sync initials
    const initials = profile.fullName
        ? profile.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
        : '..';

    // Fetch user profile from Firestore
    useEffect(() => {
        if (!isOpen || !user?.uid) return;

        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile((prev) => ({
                        ...prev,
                        fullName: data.fullName || baseName,
                        email: data.email || baseEmail,
                        university: data.university || '',
                        major: data.major || '',
                        thesisTitle: data.thesisTitle || '',
                    }));
                } else {
                    await setDoc(docRef, {
                        fullName: baseName,
                        email: baseEmail,
                        university: '',
                        major: '',
                        thesisTitle: '',
                        createdAt: new Date(),
                    });
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [isOpen, user?.uid]);

    // Save changes to Firestore
    const handleSave = async () => {
        if (!user?.uid) return;
        setIsSaving(true);
        try {
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                fullName: profile.fullName,
                university: profile.university,
                major: profile.major,
                thesisTitle: profile.thesisTitle,
            });
            setIsEditing(false);
        } catch (err) {
            console.error("Error saving profile:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        if (auth) {
            auth.signOut().then(() => {
                window.location.href = '/login';
            });
        }
    };

    // UI Variants - Polished for a premium feel
    const isDark = theme === 'dark';
    const isHappy = theme === 'happy';

    const inputClasses = cn(
        "w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all duration-300 shadow-sm",
        isDark
            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5"
            : isHappy
                ? "bg-white/60 border-orange-200 text-stone-700 focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10"
                : "bg-black/[0.03] border-black/5 text-slate-800 focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-blue-500/10"
    );

    const labelClasses = cn(
        "text-[10px] font-bold uppercase tracking-widest mb-1.5 block opacity-60",
        activeConfig.sectionLabel
    );

    const textValueClasses = cn(
        "text-sm font-medium",
        activeConfig.textMain
    );

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className={cn(
            "fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-0 transition-all duration-300",
            isOpen ? "visible" : "invisible delay-100"
        )}>
            {/* Backdrop with elegant blur */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Modal Window */}
            <div className={cn(
                "relative w-full max-w-[380px] rounded-[24px] border overflow-hidden flex flex-col shadow-[0_24px_60px_-12px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out",
                activeConfig.popup,
                isOpen
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-4 pointer-events-none"
            )}>
                {/* Header Section */}
                <div className={cn(
                    "px-6 pt-8 pb-5 flex flex-col items-center justify-center relative backdrop-blur-sm",
                    isHappy ? "bg-gradient-to-b from-orange-100/50 to-transparent"
                        : isDark ? "bg-gradient-to-b from-white/10 to-transparent"
                            : "bg-gradient-to-b from-black/5 to-transparent"
                )}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 p-1.5 rounded-full opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Avatar */}
                    <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-4 mb-4",
                        isDark ? "ring-[#1E293B]" : "ring-white",
                        isHappy ? "bg-gradient-to-br from-amber-400 to-orange-500"
                            : "bg-gradient-to-br from-blue-400 to-indigo-500"
                    )}>
                        {initials}
                    </div>

                    <h3 className={cn("text-lg font-bold tracking-tight", activeConfig.textActive)}>
                        {profile.fullName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <p className={cn("text-sm opacity-70", activeConfig.textMain)}>
                            {profile.email}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                        </div>
                    </div>
                </div>

                {/* Subtle Divider */}
                <div className={cn("h-px w-full opacity-50", activeConfig.divider)} />

                {/* Details / Edit Form Section */}
                <div className="px-6 py-5 space-y-4 relative min-h-[160px]">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin opacity-40 text-blue-500" />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
                            <div>
                                <label className={labelClasses}>University</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.university}
                                        onChange={e => setProfile({ ...profile, university: e.target.value })}
                                        className={inputClasses}
                                        placeholder="e.g. Universitas Indonesia"
                                    />
                                ) : (
                                    <p className={textValueClasses}>{profile.university || <span className="opacity-40 italic">Not set</span>}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClasses}>Major</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.major}
                                        onChange={e => setProfile({ ...profile, major: e.target.value })}
                                        className={inputClasses}
                                        placeholder="e.g. Computer Science"
                                    />
                                ) : (
                                    <p className={textValueClasses}>{profile.major || <span className="opacity-40 italic">Not set</span>}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClasses}>Thesis Title</label>
                                {isEditing ? (
                                    <textarea
                                        value={profile.thesisTitle}
                                        onChange={e => setProfile({ ...profile, thesisTitle: e.target.value })}
                                        className={cn(inputClasses, "resize-none h-20 py-3")}
                                        placeholder="Enter your thesis title..."
                                    />
                                ) : (
                                    <p className={cn(textValueClasses, "leading-relaxed")}>{profile.thesisTitle || <span className="opacity-40 italic">Not set</span>}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className={cn("h-px w-full opacity-50", activeConfig.divider)} />

                {/* Actions Section */}
                <div className="px-4 py-4 bg-black/[0.02] dark:bg-white/[0.02]">
                    {isEditing ? (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                className={cn(
                                    "flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200",
                                    isDark ? "border-white/10 hover:bg-white/5 text-slate-300"
                                        : "border-black/10 hover:bg-black/5 text-slate-600 bg-white"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={cn(
                                    "flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200",
                                    isHappy ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                                        : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
                                    isSaving && "opacity-70 cursor-not-allowed transform-none"
                                )}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                                activeConfig.bgHover,
                                activeConfig.textMain,
                                "hover:scale-[0.98] active:scale-95 border border-transparent hover:border-black/5 dark:hover:border-white/5"
                            )}
                        >
                            <Edit2 className="w-4 h-4 opacity-70" />
                            <span>Edit Profile</span>
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}