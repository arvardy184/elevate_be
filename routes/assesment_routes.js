/**
 * @swagger
 * /assessment:
 *   post:
 *     summary: Submit assessment awal user
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentStatus:
 *                 type: string
 *               majorStudy:
 *                 type: string
 *               currentSemester:
 *                 type: string
 *               passionArea:
 *                 type: string
 *               achievementGoal:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assessment tersimpan
 */