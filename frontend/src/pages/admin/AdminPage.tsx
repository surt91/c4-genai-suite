import { clsx } from 'clsx';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useEvalAvailability } from 'src/api/state/useEvalAvailability';
import { CollapseButton, ProfileButton, TransientNavigate, TransientNavLink } from 'src/components';
import { NavigationBar } from 'src/components/NavigationBar';
import { RemountOnParam } from 'src/components/RemountOnParam';
import { useTheme } from 'src/hooks';
import { texts } from 'src/texts';
import { useStateOfSelectedChatId } from '../chat/state/chat';
import classes from './AdminPage.module.css';
import { AuditLogPage } from './audit-log/AuditLogPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { EvaluationDetailPage } from './evals/evaluations/EvaluationDetailPage';
import { EvaluationsPage } from './evals/evaluations/EvaluationsPage';
import { LlmEndpointsPage } from './evals/llm-endpoints/LlmEndpointsPage';
import { MetricDetailPage } from './evals/metrics/MetricDetailPage';
import { MetricsPage } from './evals/metrics/MetricsPage';
import { QaCatalogDetailPage } from './evals/qa-catalogs/QaCatalogDetailPage';
import { QaCatalogsPage } from './evals/qa-catalogs/QaCatalogsPage';
import { ConfigurationPage } from './extensions/ConfigurationPage.tsx';
import { BucketsPage } from './files/BucketsPage';
import { ThemePage } from './theme/ThemePage';
import { UserGroupsPage } from './user-groups/UserGroupsPage';
import { UsersPage } from './users/UsersPage';

export function AdminPage() {
  const [isNavigationBarOpen, setIsNavigationBarOpen] = useState(true);
  const [isEvalsOpen, setIsEvalsOpen] = useState(false);
  const { theme } = useTheme();
  const chatId = useStateOfSelectedChatId();
  const { isEvalAvailable, isLoading: isEvalAvailabilityLoading } = useEvalAvailability();

  return (
    <div className={classes.root}>
      <NavigationBar theme={theme} redirectTo={`/chat/${chatId || ''}`} />
      <div className={clsx('sidebar-admin', classes.body)} data-testid="sidebar-admin">
        {isNavigationBarOpen && (
          <div className={classes.sidebar}>
            <div>
              <ul className={clsx('nav-menu nav-menu-bordered', classes.menu)}>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/dashboard">
                    {texts.common.dashboard}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/theme">
                    {texts.theme.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/files">
                    {texts.files.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/assistants">
                    {texts.extensions.configurations}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/users">
                    {texts.users.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/user-groups">
                    {texts.userGroups.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className={classes.link} to="/admin/audit-log">
                    {texts.auditLog.headline}
                  </TransientNavLink>
                </li>
                {isEvalAvailable && (
                  <li>
                    <button className={classes.groupButton} onClick={() => setIsEvalsOpen(!isEvalsOpen)}>
                      <span className={classes.groupLabel}>
                        {texts.evals.headline}
                        <svg
                          className={classes.chevron}
                          data-open={isEvalsOpen || undefined}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                    {isEvalsOpen && (
                      <ul className={classes.submenu}>
                        <li>
                          <TransientNavLink className={classes.link} to="/admin/evals/evaluations">
                            {texts.evals.evaluationsLabel}
                          </TransientNavLink>
                        </li>
                        <li>
                          <TransientNavLink className={classes.link} to="/admin/evals/qa-catalogs">
                            {texts.evals.qaCatalogs}
                          </TransientNavLink>
                        </li>
                        <li>
                          <TransientNavLink className={classes.link} to="/admin/evals/metrics">
                            {texts.evals.metrics}
                          </TransientNavLink>
                        </li>
                        <li>
                          <TransientNavLink className={classes.link} to="/admin/evals/llm-endpoints">
                            {texts.evals.llmEndpoints}
                          </TransientNavLink>
                        </li>
                      </ul>
                    )}
                  </li>
                )}
              </ul>
            </div>

            <div className={classes.profile}>
              <ProfileButton section="admin" />
            </div>
          </div>
        )}
        <div className={classes.main}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/theme" element={<ThemePage />} />

            <Route path="/files/*" element={<BucketsPage />} />

            <Route path="/users" element={<UsersPage />} />

            <Route path="/user-groups" element={<UserGroupsPage />} />

            <Route path="/audit-log" element={<AuditLogPage />} />

            <Route path="/assistants/*" element={<ConfigurationPage />} />

            {isEvalAvailable && (
              <>
                <Route path="/evals/evaluations" element={<EvaluationsPage />} />
                <Route
                  path="/evals/evaluations/:id"
                  element={
                    <RemountOnParam param="id">
                      <EvaluationDetailPage />
                    </RemountOnParam>
                  }
                />
                <Route path="/evals/qa-catalogs" element={<QaCatalogsPage />} />
                <Route
                  path="/evals/qa-catalogs/:catalogId"
                  element={
                    <RemountOnParam param="catalogId">
                      <QaCatalogDetailPage />
                    </RemountOnParam>
                  }
                />
                <Route path="/evals/metrics" element={<MetricsPage />} />
                <Route
                  path="/evals/metrics/:metricId"
                  element={
                    <RemountOnParam param="metricId">
                      <MetricDetailPage />
                    </RemountOnParam>
                  }
                />
                <Route path="/evals/llm-endpoints" element={<LlmEndpointsPage />} />
              </>
            )}

            {/* the eval routes are only known when the availability has been loaded (e.g. a reload of an eval page) */}
            {!isEvalAvailabilityLoading && <Route path="*" element={<TransientNavigate to="/admin/dashboard" />} />}
          </Routes>
          <CollapseButton
            className={classes.collapse}
            side="left"
            isToggled={!isNavigationBarOpen}
            onClick={() => setIsNavigationBarOpen(!isNavigationBarOpen)}
            tooltip={isNavigationBarOpen ? texts.common.hide(texts.common.menu) : texts.common.show(texts.common.menu)}
          />
        </div>
      </div>
    </div>
  );
}
