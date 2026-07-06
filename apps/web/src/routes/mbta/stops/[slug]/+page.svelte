<script lang="ts">
  import SeoLandingPage from '$lib/seo/SeoLandingPage.svelte';

  export let data: {
    landingPage: import('$lib/seo/landing-pages').LandingPage;
    canonicalUrl: string;
    shareImageUrl: string;
    siteOrigin: string;
  };
</script>

<SeoLandingPage {data} />
