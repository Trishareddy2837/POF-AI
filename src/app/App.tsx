import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AppLayout } from '../components/layout/AppLayout';
import { AdminRoute, GuestRoute, ProtectedRoute } from '../components/auth/RouteGuards';
import { useAuth } from './AuthProvider';
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage';
import CareerAnalysisPage from '../pages/CareerAnalysisPage';
import * as P from '../pages/FeaturePages';
import * as S from '../pages/StudentPages';
import * as R from '../pages/RoadmapPages';
import * as A from '../pages/AuthPages';
import * as O from '../pages/OpportunityPages';
import { ResumeBuilderPage } from '../pages/ResumeBuilderPage';
import { PublisherPage, AdminOpportunityPage } from '../pages/PublisherPages';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { PracticeChallengesPage } from '../pages/PracticeChallengesPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
function Adaptive() { const { session } = useAuth(); return session ? <AppLayout /> : <PublicLayout />; }
const prot = (el: JSX.Element) => <ProtectedRoute>{el}</ProtectedRoute>;
export function AppRoutes() {
  return (<Routes><Route element={<Adaptive />}>
    <Route index element={<HomePage />} /><Route path="about" element={<P.AboutPage />} /><Route path="help" element={<P.HelpPage />} />
    <Route path="careers" element={<R.CareerCataloguePage />} /><Route path="career-roles" element={<R.CareerCataloguePage />} />
    <Route path="courses" element={<P.CoursesPage />} /><Route path="courses/:courseId" element={<P.CourseDetailPage />} />
    <Route path="roadmaps" element={prot(<R.RoadmapsPage />)} /><Route path="roadmaps/create" element={<R.RoadmapCreatePage />} />
    <Route path="roadmaps/:roadmapId/milestones/:milestoneId" element={prot(<R.RoadmapMilestonePage />)} /><Route path="roadmaps/:roadmapId" element={prot(<R.RoadmapDetailPage />)} />
    <Route path="learning-resources" element={prot(<R.LearningResourcesPage />)} />
    <Route path="internships" element={<O.InternshipsPage />} /><Route path="hackathons" element={<O.HackathonsPage />} />
    <Route path="jobs" element={<O.JobsPage />} /><Route path="applications" element={prot(<O.ApplicationsPage />)} /><Route path="resume-builder" element={<ResumeBuilderPage />} /><Route path="publisher" element={prot(<PublisherPage />)} /><Route path="admin/opportunities" element={prot(<AdminOpportunityPage />)} />
    <Route path="competitions" element={<O.CompetitionsPage />} /><Route path="challenges" element={<PracticeChallengesPage />} /><Route path="analytics" element={prot(<AnalyticsPage />)} />
    <Route path="login" element={<GuestRoute><A.LoginPage /></GuestRoute>} /><Route path="admin/login" element={<A.LoginPage />} /><Route path="register" element={<GuestRoute><A.RegisterPage /></GuestRoute>} />
    <Route path="forgot-password" element={<GuestRoute><A.ForgotPasswordPage /></GuestRoute>} /><Route path="reset-password" element={<A.ResetPasswordPage />} />
    <Route path="auth/callback" element={<A.AuthCallbackPage />} />
    <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} /><Route path="admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
    <Route path="dashboard" element={prot(<S.DashboardPage />)} /><Route path="profile" element={prot(<ProfilePage />)} />
    <Route path="career-analysis" element={prot(<CareerAnalysisPage />)} /><Route path="progress" element={<Navigate to="/dashboard" replace />} /><Route path="my-progress" element={<Navigate to="/dashboard" replace />} /><Route path="settings" element={prot(<S.SettingsPage />)} />
    <Route path="*" element={<P.ComingSoon title="Page not found" batch="no batch (this route does not exist)" />} />
  </Route></Routes>);
}
