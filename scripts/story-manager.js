/**
 * Story Manager Module
 * Handles story discovery, loading, and progression logic
 * Pure data layer - no UI manipulation
 */

export class StoryManager {
  constructor() {
    this.discoveredStories = {};
    this.currentStory = null;
    this.currentChapter = 0;
    this.storyMode = false;
  }

  // Discover available story files
  async discoverStories() {
    console.log('📚 Discovering story files...');
    this.discoveredStories = {};
    
    const storyPatterns = [
      'comprehensive-feature-tour.json',
      'inflation-journey.json',
      'jeffs-unknown-unknown.json', 
      'compound-interest-magic.json',
      'market-crash-series.json',
      'retirement-reality-check.json'
    ];

    for (const filename of storyPatterns) {
      await this.tryLoadStory(filename);
    }

    console.log(`✅ Found ${Object.keys(this.discoveredStories).length} stories`);
    return this.discoveredStories;
  }

  // Attempt to load a story file
  async tryLoadStory(filename) {
    try {
      const response = await fetch(`data/stories/${filename}`);
      if (response.ok) {
        const storyData = await response.json();
        const storyKey = Object.keys(storyData)[0];
        const story = storyData[storyKey];
        
        if (this.validateStory(story)) {
          this.discoveredStories[storyKey] = {
            filename: filename,
            ...story
          };
          console.log(`✅ Found story: ${storyKey}`);
          return true;
        } else {
          console.warn(`⚠️ Invalid format in ${filename}: missing required fields`);
          return false;
        }
      } else {
        console.log(`📁 Not found: ${filename}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error loading ${filename}:`, error.message);
      return false;
    }
  }

  // Validate story structure
  validateStory(story) {
    return (
      story.metadata &&
      story.chapters &&
      Array.isArray(story.chapters) &&
      story.chapters.length > 0 &&
      story.chapters.every(chapter => 
        chapter.scenario_key && 
        chapter.narrative
      )
    );
  }

  // Start a story
  startStory(storyKey) {
    const story = this.discoveredStories[storyKey];
    if (!story) {
      throw new Error(`Story "${storyKey}" not found`);
    }

    this.currentStory = story;
    this.currentChapter = 0;
    this.storyMode = true;
    
    console.log(`📖 Starting story: ${story.metadata.title}`);
    return this.getCurrentChapter();
  }

  // Get current chapter data
  getCurrentChapter() {
    if (!this.isInStoryMode()) {
      return null;
    }

    const chapter = this.currentStory.chapters[this.currentChapter];
    if (!chapter) {
      return null;
    }

    return {
      ...chapter,
      chapterNumber: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      isFirstChapter: this.currentChapter === 0,
      isLastChapter: this.currentChapter === this.currentStory.chapters.length - 1
    };
  }

  // Advance to next chapter
  nextChapter() {
    if (!this.isInStoryMode()) {
      return null;
    }

    if (this.currentChapter < this.currentStory.chapters.length - 1) {
      this.currentChapter++;
      console.log(`📖 Advanced to chapter ${this.currentChapter + 1}`);
      return this.getCurrentChapter();
    }

    // Story completed
    console.log('📖 Story completed!');
    return null;
  }

  // Go to previous chapter
  previousChapter() {
    if (!this.isInStoryMode() || this.currentChapter === 0) {
      return null;
    }

    this.currentChapter--;
    console.log(`📖 Returned to chapter ${this.currentChapter + 1}`);
    return this.getCurrentChapter();
  }

  // Jump to specific chapter
  goToChapter(chapterIndex) {
    if (!this.isInStoryMode()) {
      return null;
    }

    if (chapterIndex >= 0 && chapterIndex < this.currentStory.chapters.length) {
      this.currentChapter = chapterIndex;
      return this.getCurrentChapter();
    }

    return null;
  }

  // Exit story mode
  exitStory() {
    this.currentStory = null;
    this.currentChapter = 0;
    this.storyMode = false;
    console.log('📖 Exited story mode');
  }

  // Check if currently in story mode
  isInStoryMode() {
    return this.storyMode && this.currentStory !== null;
  }

  // Get story metadata for listing
  getStoryList() {
    const stories = {};
    for (const [key, story] of Object.entries(this.discoveredStories)) {
      stories[key] = {
        title: story.metadata.title,
        description: story.metadata.description,
        chapterCount: story.chapters.length,
        duration: story.metadata.estimated_duration,
        difficulty: story.metadata.difficulty || 'beginner'
      };
    }
    return stories;
  }

  // Get insights for current scenario based on story context
  getStoryInsights(simulationResults, scenarioData) {
    const chapter = this.getCurrentChapter();
    if (!chapter || !chapter.narrative.insights) {
      return [];
    }

    // Process dynamic insights with simulation data
    return chapter.narrative.insights.map(insight => {
      return this.processInsightTemplate(insight, simulationResults, scenarioData);
    });
  }

  // Get story-driven next action
  getStoryNextAction() {
    const chapter = this.getCurrentChapter();
    if (!chapter) {
      return null;
    }

    if (chapter.isLastChapter) {
      return {
        type: 'story_complete',
        title: 'Story Complete!',
        description: chapter.narrative.completion_message || 'You\'ve completed this story.',
        action: 'Exit Story Mode'
      };
    }

    const nextChapter = this.currentStory.chapters[this.currentChapter + 1];
    return {
      type: 'next_chapter',
      title: `Next: ${nextChapter.title}`,
      description: nextChapter.narrative.introduction,
      action: `Continue to Chapter ${this.currentChapter + 2}`
    };
  }

  // Process dynamic content in insights
  processInsightTemplate(template, results, scenarioData) {
    let processed = template;
    
    // Replace common placeholders
    if (results && results.length > 0) {
      // FIXED: Find when money actually runs out (first shortfall > 0)
      let moneyRunsOutYear = null;
      for (let i = 0; i < results.length; i++) {
        if (results[i].shortfall > 0) {
          moneyRunsOutYear = Math.round((i + 1) / 12);
          break;
        }
      }
      
      // If no shortfall found, money lasts the full duration
      if (moneyRunsOutYear === null) {
        moneyRunsOutYear = Math.round(results.length / 12);
      }
      
      processed = processed
        .replace('{{duration_years}}', moneyRunsOutYear)
        .replace('{{money_runs_out_year}}', moneyRunsOutYear)
        .replace('{{monthly_expenses}}', scenarioData.plan?.monthly_expenses?.toLocaleString() || 'N/A');
    }

    // Calculate withdrawal rate if we have the data
    if (scenarioData.plan?.monthly_expenses && window._scenarioResult?.balanceHistory) {
      const monthlyExpenses = scenarioData.plan.monthly_expenses;
      const initialBalance = Object.values(window._scenarioResult.balanceHistory).reduce((total, balances) => {
        return total + (balances[0] || 0);
      }, 0);
      
      if (initialBalance > 0) {
        const annualWithdrawal = monthlyExpenses * 12;
        const withdrawalRate = (annualWithdrawal / initialBalance * 100).toFixed(1);
        processed = processed.replace('{{withdrawal_rate}}', withdrawalRate);
      }
    }

    // NEW: Calculate compound interest metrics for accumulation scenarios
    if (window._scenarioResult?.balanceHistory && scenarioData.deposits) {
      const balanceHistory = window._scenarioResult.balanceHistory;
      
      // Get final balance from the investment portfolio
      const investmentBalances = balanceHistory['Investment Portfolio'] || [];
      const finalBalance = investmentBalances[investmentBalances.length - 1] || 0;
      
      // Calculate total deposits
      let totalDeposits = 0;
      scenarioData.deposits.forEach(deposit => {
        const months = (deposit.stop_month || results.length) - (deposit.start_month - 1);
        totalDeposits += deposit.amount * months;
      });
      
      if (finalBalance > 0 && totalDeposits > 0) {
        const profit = finalBalance - totalDeposits;
        const multiplier = finalBalance / totalDeposits;
        
        processed = processed
          .replace('{{final_balance_formatted}}', `${Math.round(finalBalance).toLocaleString()}`)
          .replace('{{profit_formatted}}', `${Math.round(profit).toLocaleString()}`)
          .replace('{{multiplier_formatted}}', multiplier.toFixed(1))
          .replace('{{total_invested_formatted}}', `${totalDeposits.toLocaleString()}`);
      }
    }

    return processed;
  }

  // Get current story progress
  getStoryProgress() {
    if (!this.isInStoryMode()) {
      return null;
    }

    return {
      storyTitle: this.currentStory.metadata.title,
      currentChapter: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      progress: ((this.currentChapter + 1) / this.currentStory.chapters.length) * 100
    };
  }

  // Get all discovered stories
  getDiscoveredStories() {
    return this.discoveredStories;
  }
}