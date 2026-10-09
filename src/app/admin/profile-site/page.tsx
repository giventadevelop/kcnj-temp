import ProfileSiteAdminClient from './ProfileSiteAdminClient';
import {
  fetchPublicProfileServer,
  fetchProfileWritingsServer,
  fetchProfileAchievementsServer,
  fetchProfileAffiliationsServer,
  fetchProfileMediaAssetsServer,
  fetchProfileProjectsServer,
  fetchProfileServicesServer,
  fetchProfileFamilyMembersServer,
} from './ApiServerActions';

export default async function ProfileSiteAdminPage() {
  const [profile, writings, achievements, affiliations, assets, projects, services, family] = await Promise.all([
    fetchPublicProfileServer(),
    fetchProfileWritingsServer(false),
    fetchProfileAchievementsServer(),
    fetchProfileAffiliationsServer(),
    fetchProfileMediaAssetsServer(),
    fetchProfileProjectsServer(),
    fetchProfileServicesServer(),
    fetchProfileFamilyMembersServer(),
  ]);

  return (
    <ProfileSiteAdminClient
      initialProfile={profile}
      initialWritings={writings}
      initialAchievements={achievements}
      initialAffiliations={affiliations}
      initialAssets={assets}
      initialProjects={projects}
      initialServices={services}
      initialFamily={family}
    />
  );
}
