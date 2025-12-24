const { ref, get, set } = require("firebase/database");

/**
 * Load categories from Firebase
 */
async function loadCategories(db) {
  try {
    const snapshot = await get(ref(db, "categories"));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (err) {
    console.error("Error loading categories:", err);
    return null;
  }
}

/**
 * Convert flat puzzles into hierarchical schema
 */
async function migrateToHierarchicalSchema(db, puzzles, firebaseKeys = []) {
  console.log("🚀 Migrating puzzles to hierarchical schema...");

  const categories = {};

  puzzles.forEach((puzzle, index) => {
    const categoryName = puzzle.theme || "General";
    const categoryKey = categoryName.toLowerCase().replace(/\s+/g, "_");

    if (!categories[categoryKey]) {
      categories[categoryKey] = {
        id: Object.keys(categories).length + 1,
        name: categoryName,
        description: "",
        order: Object.keys(categories).length + 1,
        themes: {},
      };
    }

    const themeKey = "default";
    if (!categories[categoryKey].themes[themeKey]) {
      categories[categoryKey].themes[themeKey] = {
        id: 1,
        name: categoryName,
        description: "",
        order: 1,
        puzzles: {},
      };
    }

    const puzzleId = puzzle.id || index + 1;

    categories[categoryKey].themes[themeKey].puzzles[puzzleId] = {
      id: puzzleId,
      theme: categoryName,
      spangram: puzzle.spangram || "",
      nonThemeWords: puzzle.nonThemeWords || [],
      themeWords: puzzle.words || [],
      letters: puzzle.letters || [],
      createdAt: Date.now(),
    };
  });

  await set(ref(db, "categories"), categories);

  console.log("✅ Migration completed");
  return categories;
}

/**
 * Flatten hierarchical puzzles into array
 */
function flattenPuzzles(categories) {
  const puzzles = [];

  Object.entries(categories || {}).forEach(([catKey, category]) => {
    Object.entries(category.themes || {}).forEach(([themeKey, theme]) => {
      Object.entries(theme.puzzles || {}).forEach(([puzzleId, puzzle]) => {
        puzzles.push({
          ...puzzle,
          categoryId: category.id,
          category: category.name,
          themeId: theme.id,
          themeName: theme.name,
        });
      });
    });
  });

  return puzzles;
}

module.exports = {
  migrateToHierarchicalSchema,
  loadCategories,
  flattenPuzzles,
};
