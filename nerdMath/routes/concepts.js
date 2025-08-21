const express = require('express');
const router = express.Router();
const { Concept, Unit } = require('../models');

// 소단원별 개념 조회 API
router.get('/:unitId/concept', async (req, res) => {
  try {
    const { unitId } = req.params;

    // 단위 조회
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // 개념 조회
    const concept = await Concept.findOne({ unitId: unitId });
    if (!concept) {
      return res.status(404).json({ error: 'Concept not found for this unit' });
    }

    // 응답 구성
    const response = {
      conceptId: concept._id.toString(),
      unitId: concept.unitId.toString(),
      blocks: concept.blocks,
      createdAt: concept.createdAt ? concept.createdAt.toISOString() : new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching concept:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;