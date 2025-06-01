// Route untuk proxy video content dari private B2 bucket
router.get('/videos/proxy/:videoId', courseController.proxyVideoContent); 