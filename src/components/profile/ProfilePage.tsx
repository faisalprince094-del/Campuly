import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User as UserIcon,
  GraduationCap,
  Award,
  Timer,
  CheckSquare,
  Presentation,
  Flame,
  Edit3,
  Camera,
  BookOpen,
  Sparkles,
  Upload,
  Trash2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from '../ui/UserAvatar';
import { ImageCropModal } from './ImageCropModal';
import { validateImageFile, loadFileToImage } from '../../utils/imageStorage';
import { calculateStudyStreak } from '../../utils/studyTracker';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, studySessions, tasks, presentations, subjects, showToast } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [semester, setSemester] = useState(user?.semester || '');

  // Profile photo workflow state
  const [stagedPhoto, setStagedPhoto] = useState<string | null>(user?.profilePhoto || null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [rawImageElement, setRawImageElement] = useState<HTMLImageElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalStudyMinutes = studySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const focusStreak = calculateStudyStreak(studySessions);

  const handleStartEditing = () => {
    setName(user?.name || '');
    setUniversity(user?.university || '');
    setDepartment(user?.department || '');
    setSemester(user?.semester || '');
    setStagedPhoto(user?.profilePhoto || null);
    setUploadError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setStagedPhoto(user?.profilePhoto || null);
    setUploadError(null);
    setIsEditing(false);
  };

  // Process incoming file (from input or drag-drop)
  const processSelectedFile = async (file: File) => {
    setUploadError(null);

    // 1. Validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      const err = validation.error || 'Invalid image file.';
      setUploadError(err);
      showToast(err, 'error');
      return;
    }

    try {
      // 2. Decode image safely
      const { image, dataUrl } = await loadFileToImage(file);
      setRawImageElement(image);
      setRawImageSrc(dataUrl);
      setCropModalOpen(true);
    } catch (err: any) {
      const errMessage = err?.message || 'Failed to load image. Please select a valid JPG, PNG, or WEBP file.';
      setUploadError(errMessage);
      showToast(errMessage, 'error');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
    // Reset input value so same file can be re-selected if desired
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Called when user finishes cropping in modal
  const handleApplyCrop = (croppedDataUrl: string) => {
    setStagedPhoto(croppedDataUrl);
    setCropModalOpen(false);
    setUploadError(null);
    showToast('Photo cropped. Click "Save Changes" to apply.', 'info');
  };

  // Remove photo action
  const handleRemovePhoto = () => {
    setStagedPhoto(null);
    setUploadError(null);
    showToast('Photo removed. Default avatar will be restored when saved.', 'info');
  };

  // Save changes to profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim() || 'Student',
        university: university.trim(),
        department: department.trim(),
        semester: semester.trim(),
        profilePhoto: stagedPhoto || '',
      });
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const badges = [
    { title: 'Focus Pioneer', desc: 'Completed 5+ Pomodoro focus intervals', icon: Timer, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60' },
    { title: 'Slide Master', desc: 'Generated AI presentation decks with speech', icon: Sparkles, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60' },
    { title: 'Task Crusher', desc: 'Completed academic deadlines on time', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
    { title: '7-Day Streak', desc: 'Studied consecutive days without break', icon: Flame, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Hidden native file input for profile photo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        aria-label="Upload Profile Photo"
      />

      {/* Image Cropping & Optimization Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageElement={rawImageElement}
        imageSrc={rawImageSrc}
        onClose={() => setCropModalOpen(false)}
        onApplyCrop={handleApplyCrop}
        onChangeImageRequest={() => {
          setCropModalOpen(false);
          fileInputRef.current?.click();
        }}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
          Your university academic records, focus streaks, and verified achievements.
        </p>
      </div>

      {/* Main Identity Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* View Avatar with Sparkle badge */}
            <div className="relative shrink-0">
              <UserAvatar
                src={user?.profilePhoto}
                name={user?.name || 'Student'}
                size="2xl"
                className="w-20 h-20 shadow-md ring-4 ring-blue-600/15"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                {user?.name || 'Student Name'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
                <span>{user?.university || 'University'}</span>
                <span>•</span>
                <span>{user?.department || 'Department'}</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{user?.semester || 'Semester'}</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">{user?.email || 'student@campusly.edu'}</p>
            </div>
          </div>

          <button
            id="edit-profile-toggle-btn"
            onClick={isEditing ? handleCancelEditing : handleStartEditing}
            className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-[#101823] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Edit Form Drawer */}
        <AnimatePresence>
          {isEditing && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSaveProfile}
              className="mt-6 pt-6 border-t border-slate-100 dark:border-[#1E293B] space-y-6 overflow-hidden"
            >
              {/* SECTION 1: Profile Photo Upload & Management (Requirement 1, 2, 3, 4) */}
              <div
                id="edit-profile-photo-section"
                className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#101823]/60 border border-slate-200/80 dark:border-[#1E293B] space-y-4"
              >
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Profile Picture
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload a high-resolution square photo. Supported formats: JPG, PNG, WEBP (Max 10MB).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Interactive Circular Avatar Preview with Camera Overlay */}
                  <div
                    id="avatar-upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`group relative w-24 h-24 rounded-full cursor-pointer select-none transition-all ${
                      isDraggingOver
                        ? 'ring-4 ring-blue-600 scale-105 shadow-lg'
                        : 'hover:ring-4 hover:ring-blue-600/30'
                    }`}
                    title="Click or drag to change profile photo"
                  >
                    <UserAvatar
                      src={stagedPhoto}
                      name={name || user?.name || 'Student'}
                      size="3xl"
                      className="w-24 h-24 shadow-md ring-2 ring-blue-600/20"
                    />

                    {/* Camera / Edit Overlay Badge */}
                    <div className="absolute inset-0 rounded-full bg-slate-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">Change</span>
                    </div>

                    {/* Bottom-right Camera Icon Pill */}
                    <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0B1017] group-hover:scale-110 transition-transform">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Actions & Format Information */}
                  <div className="flex-1 flex flex-col items-center sm:items-start gap-2.5 text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                      <button
                        type="button"
                        id="change-photo-btn"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-blue-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                      </button>

                      {stagedPhoto && (
                        <button
                          type="button"
                          id="remove-photo-btn"
                          onClick={handleRemovePhoto}
                          className="px-3.5 py-2 bg-white dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] hover:border-red-300 dark:hover:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                      <span>Drag and drop an image or click Change Photo to crop & adjust.</span>
                    </div>

                    {/* Error Feedback */}
                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Academic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    id="profile-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    University
                  </label>
                  <input
                    id="profile-uni-input"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. BRAC University, Stanford, MIT"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Department / Major
                  </label>
                  <input
                    id="profile-dept-input"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Semester / Year
                  </label>
                  <input
                    id="profile-sem-input"
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g. 5th Semester, Junior Year"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="cancel-profile-btn"
                  onClick={handleCancelEditing}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#101823] transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  id="save-profile-btn"
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Academic Highlights 4-Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400">Total Study</span>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{totalStudyHours}h</div>
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Focus logged</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400">Tasks Completed</span>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{completedTasksCount}</div>
          <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">Assignments</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400">AI Decks</span>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{presentations.length}</div>
          <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">Created with speech</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400">Focus Streak</span>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
            {focusStreak} {focusStreak === 1 ? 'Day' : 'Days'}
          </div>
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Active consistency</div>
        </div>
      </div>

      {/* Badges and Achievements */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Academic Badges</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101823]/60 border border-slate-200/80 dark:border-[#1E293B]"
              >
                <div className={`w-11 h-11 rounded-2xl ${b.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">{b.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
