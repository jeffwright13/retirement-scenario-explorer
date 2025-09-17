/**
 * Tests for StoryUI.js
 */

import { jest } from '@jest/globals';
import { StoryUI } from '../../../scripts/ui/StoryUI.js';

describe('StoryUI', () => {
  let storyUI;
  let mockEventBus;
  let mockElements;

  beforeEach(() => {
    // Mock event bus
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn()
    };

    // Mock DOM elements
    mockElements = {
      storyPanel: {},
      storySelector: {
        addEventListener: jest.fn(),
        innerHTML: '',
        appendChild: jest.fn(),
        value: ''
      },
      storyExitBtn: {},
      introductionSection: { style: { display: '' } },
      introductionText: { textContent: '' },
      introductionDismiss: { addEventListener: jest.fn() },
      errorSection: { style: { display: '' } },
      errorText: { textContent: '' },
      errorDismiss: { addEventListener: jest.fn() },
      progressSection: {},
      progressFill: { style: { width: '' } },
      progressText: { textContent: '' },
      storyNarrative: {},
      chapterTitle: { textContent: '' },
      storyIntroduction: { textContent: '' },
      storySetup: { textContent: '' },
      prevButton: { addEventListener: jest.fn(), disabled: false },
      nextButton: { addEventListener: jest.fn(), disabled: false, textContent: '' },
      runSimulationBtn: { 
        addEventListener: jest.fn(), 
        style: { display: '' }, 
        disabled: false, 
        textContent: '' 
      },
      resultsSection: { style: { display: '' } },
      insightsSection: { innerHTML: '' },
      takeawaySection: { textContent: '' },
      cliffhangerSection: { textContent: '' }
    };

    // Mock document methods
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      const elementMap = {
        'story-panel': mockElements.storyPanel,
        'story-selector': mockElements.storySelector,
        'story-exit-btn': mockElements.storyExitBtn,
        'story-introduction-section': mockElements.introductionSection,
        'story-introduction-text': mockElements.introductionText,
        'story-introduction-dismiss': mockElements.introductionDismiss,
        'story-error-section': mockElements.errorSection,
        'story-error-text': mockElements.errorText,
        'story-error-dismiss': mockElements.errorDismiss,
        'story-progress': mockElements.progressSection,
        'chapter-progress': mockElements.progressFill,
        'chapter-counter': mockElements.progressText,
        'story-narrative': mockElements.storyNarrative,
        'story-chapter-title': mockElements.chapterTitle,
        'story-introduction': mockElements.storyIntroduction,
        'story-setup': mockElements.storySetup,
        'story-prev-btn': mockElements.prevButton,
        'story-next-btn': mockElements.nextButton,
        'story-run-simulation': mockElements.runSimulationBtn,
        'story-results': mockElements.resultsSection,
        'story-insights': mockElements.insightsSection,
        'story-takeaway': mockElements.takeawaySection,
        'story-cliffhanger': mockElements.cliffhangerSection
      };
      return elementMap[id] || null;
    });

    // Mock document.createElement
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'option') {
        return {
          value: '',
          textContent: ''
        };
      }
      return null;
    });

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    storyUI = new StoryUI(mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(storyUI.eventBus).toBe(mockEventBus);
      expect(storyUI.isInitialized).toBe(false);
      expect(storyUI.currentStory).toBeNull();
      expect(storyUI.currentChapter).toBeNull();
    });

    test('should initialize UI element references as null', () => {
      expect(storyUI.storyPanel).toBeNull();
      expect(storyUI.storySelector).toBeNull();
      expect(storyUI.storyContent).toBeNull();
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      storyUI.initialize();
      
      expect(storyUI.isInitialized).toBe(true);
      expect(storyUI.storyPanel).toBe(mockElements.storyPanel);
      expect(storyUI.storySelector).toBe(mockElements.storySelector);
      expect(console.log).toHaveBeenCalledWith('📚 Initializing Story UI');
    });

    test('should set up event listeners during initialization', () => {
      storyUI.initialize();
      
      expect(mockEventBus.on).toHaveBeenCalledWith('story-engine:story-loaded', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('story-engine:chapter-changed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('story-engine:simulation-completed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('story-engine:story-completed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('stories:loaded', expect.any(Function));
    });

    test('should set up UI element event listeners', () => {
      storyUI.initialize();
      
      expect(mockElements.storySelector.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockElements.prevButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.nextButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.runSimulationBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.introductionDismiss.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.errorDismiss.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should log UI elements status', () => {
      storyUI.initialize();
      
      expect(console.log).toHaveBeenCalledWith('📚 Story UI elements initialized:', {
        storyPanel: true,
        storySelector: true,
        progressSection: true,
        storyNarrative: true
      });
    });
  });

  describe('UI Event Handlers', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should handle story selector change', () => {
      const changeHandler = mockElements.storySelector.addEventListener.mock.calls[0][1];
      const mockEvent = { target: { value: 'test-story' } };
      
      changeHandler(mockEvent);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:select', 'test-story');
    });

    test('should not emit event for empty story selector value', () => {
      const changeHandler = mockElements.storySelector.addEventListener.mock.calls[0][1];
      const mockEvent = { target: { value: '' } };
      
      changeHandler(mockEvent);
      
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test('should handle previous button click', () => {
      const clickHandler = mockElements.prevButton.addEventListener.mock.calls[0][1];
      
      clickHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:previous');
    });

    test('should handle next button click', () => {
      const clickHandler = mockElements.nextButton.addEventListener.mock.calls[0][1];
      
      clickHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:next');
    });

    test('should handle run simulation button click', () => {
      const clickHandler = mockElements.runSimulationBtn.addEventListener.mock.calls[0][1];
      
      clickHandler();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:run-simulation');
    });

    test('should handle introduction dismiss button click', () => {
      const clickHandler = mockElements.introductionDismiss.addEventListener.mock.calls[0][1];
      const hideSpy = jest.spyOn(storyUI, 'hideIntroduction');
      
      clickHandler();
      
      expect(hideSpy).toHaveBeenCalled();
    });

    test('should handle error dismiss button click', () => {
      const clickHandler = mockElements.errorDismiss.addEventListener.mock.calls[0][1];
      const hideSpy = jest.spyOn(storyUI, 'hideError');
      
      clickHandler();
      
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('Story Selector Population', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should populate story selector with stories', () => {
      const stories = [
        { key: 'story1', title: 'First Story' },
        { key: 'story2', title: 'Second Story' }
      ];
      const mockOptions = [
        { value: '', textContent: '' },
        { value: '', textContent: '' }
      ];
      
      jest.spyOn(document, 'createElement').mockImplementation(() => mockOptions.shift());
      
      storyUI.populateStorySelector(stories);
      
      expect(mockElements.storySelector.innerHTML).toBe('<option value="">Choose Your Journey...</option>');
      expect(mockElements.storySelector.appendChild).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith('📚 Populated story selector with 2 stories');
    });

    test('should handle stories without titles', () => {
      const stories = [{ key: 'story-without-title' }];
      const mockOption = { value: '', textContent: '' };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockOption);
      
      storyUI.populateStorySelector(stories);
      
      expect(mockOption.value).toBe('story-without-title');
      expect(mockOption.textContent).toBe('story-without-title');
    });

    test('should handle missing story selector gracefully', () => {
      storyUI.storySelector = null;
      
      expect(() => storyUI.populateStorySelector([{ key: 'test' }])).not.toThrow();
    });
  });

  describe('Story Engine Event Handlers', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should handle story loaded event', () => {
      const storyData = {
        story: {
          metadata: {
            title: 'Test Story',
            introduction: 'Welcome to the story'
          }
        },
        totalChapters: 5
      };

      const showIntroSpy = jest.spyOn(storyUI, 'showIntroduction');
      const updateProgressSpy = jest.spyOn(storyUI, 'updateProgress');
      const hideResultsSpy = jest.spyOn(storyUI, 'hideResults');

      const storyLoadedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:story-loaded')[1];
      
      storyLoadedHandler(storyData);
      
      expect(storyUI.currentStory).toBe(storyData.story);
      expect(showIntroSpy).toHaveBeenCalledWith('Welcome to the story');
      expect(updateProgressSpy).toHaveBeenCalledWith(5, 1);
      expect(hideResultsSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('📚 Story loaded: Test Story');
    });

    test('should handle story loaded without introduction', () => {
      const storyData = {
        story: { metadata: { title: 'Test Story' } },
        totalChapters: 3
      };

      const showIntroSpy = jest.spyOn(storyUI, 'showIntroduction');
      const storyLoadedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:story-loaded')[1];
      
      storyLoadedHandler(storyData);
      
      expect(showIntroSpy).not.toHaveBeenCalled();
    });

    test('should handle chapter changed event', () => {
      const chapterData = {
        chapter: { title: 'Chapter 1' },
        progress: { total: 5, current: 2 },
        chapterIndex: 1
      };

      const updateContentSpy = jest.spyOn(storyUI, 'updateChapterContent');
      const updateProgressSpy = jest.spyOn(storyUI, 'updateProgress');
      const updateNavSpy = jest.spyOn(storyUI, 'updateNavigationButtons');
      const hideResultsSpy = jest.spyOn(storyUI, 'hideResults');

      const chapterChangedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:chapter-changed')[1];
      
      chapterChangedHandler(chapterData);
      
      expect(storyUI.currentChapter).toBe(chapterData.chapter);
      expect(updateContentSpy).toHaveBeenCalledWith(chapterData.chapter);
      expect(updateProgressSpy).toHaveBeenCalledWith(5, 2);
      expect(updateNavSpy).toHaveBeenCalledWith(1, 5);
      expect(hideResultsSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('📚 Chapter changed: Chapter 1');
    });

    test('should handle simulation completed event', () => {
      const simulationData = { chapterIndex: 2 };

      const showResultsSpy = jest.spyOn(storyUI, 'showResults');
      const simulationCompletedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:simulation-completed')[1];
      
      simulationCompletedHandler(simulationData);
      
      expect(showResultsSpy).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:request-processed-narrative');
      expect(console.log).toHaveBeenCalledWith('📚 Simulation completed for chapter 3');
    });

    test('should handle story completed event', () => {
      const showCompletionSpy = jest.spyOn(storyUI, 'showCompletionMessage');
      const storyCompletedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:story-completed')[1];
      
      storyCompletedHandler();
      
      expect(showCompletionSpy).toHaveBeenCalled();
      expect(mockElements.nextButton.disabled).toBe(true);
      expect(mockElements.nextButton.textContent).toBe('Story Complete');
      expect(console.log).toHaveBeenCalledWith('📚 Story completed');
    });

    test('should handle stories loaded event', () => {
      const stories = [{ key: 'story1', title: 'Story 1' }];
      const populateSpy = jest.spyOn(storyUI, 'populateStorySelector');
      const storiesLoadedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'stories:loaded')[1];
      
      storiesLoadedHandler(stories);
      
      expect(populateSpy).toHaveBeenCalledWith(stories);
    });
  });

  describe('Chapter Content Updates', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should update chapter content', () => {
      const chapter = {
        title: 'Test Chapter',
        narrative: {
          introduction: 'Chapter introduction',
          setup: 'Chapter setup'
        }
      };

      storyUI.updateChapterContent(chapter);

      expect(mockElements.chapterTitle.textContent).toBe('Test Chapter');
      expect(mockElements.storyIntroduction.textContent).toBe('Chapter introduction');
      expect(mockElements.storySetup.textContent).toBe('Chapter setup');
      expect(mockElements.runSimulationBtn.style.display).toBe('block');
      expect(mockElements.runSimulationBtn.disabled).toBe(false);
      expect(mockElements.runSimulationBtn.textContent).toBe('Run This Scenario');
    });

    test('should handle chapter without narrative', () => {
      const chapter = { title: 'Test Chapter' };

      expect(() => storyUI.updateChapterContent(chapter)).not.toThrow();
      expect(mockElements.chapterTitle.textContent).toBe('Test Chapter');
    });

    test('should update processed narrative', () => {
      const narrative = {
        insights: ['Insight 1', 'Insight 2'],
        key_takeaway: 'Key takeaway message',
        cliff_hanger: 'Cliffhanger text'
      };

      storyUI.updateProcessedNarrative(narrative);

      expect(mockElements.insightsSection.innerHTML).toBe('<ul><li>Insight 1</li><li>Insight 2</li></ul>');
      expect(mockElements.takeawaySection.textContent).toBe('Key takeaway message');
      expect(mockElements.cliffhangerSection.textContent).toBe('Cliffhanger text');
    });

    test('should handle processed narrative with missing sections', () => {
      const narrative = { insights: ['Test insight'] };

      expect(() => storyUI.updateProcessedNarrative(narrative)).not.toThrow();
    });
  });

  describe('Progress Updates', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should update progress correctly', () => {
      storyUI.updateProgress(5, 3);

      expect(mockElements.progressFill.style.width).toBe('60%');
      expect(mockElements.progressText.textContent).toBe('Chapter 3 of 5');
    });

    test('should handle edge cases in progress calculation', () => {
      storyUI.updateProgress(1, 1);

      expect(mockElements.progressFill.style.width).toBe('100%');
      expect(mockElements.progressText.textContent).toBe('Chapter 1 of 1');
    });

    test('should handle missing progress elements gracefully', () => {
      storyUI.progressFill = null;
      storyUI.progressText = null;

      expect(() => storyUI.updateProgress(5, 3)).not.toThrow();
    });
  });

  describe('Navigation Button Updates', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should update navigation buttons for first chapter', () => {
      storyUI.updateNavigationButtons(0, 5);

      expect(mockElements.prevButton.disabled).toBe(true);
      expect(mockElements.nextButton.disabled).toBe(false);
      expect(mockElements.nextButton.textContent).toBe('Next Chapter →');
    });

    test('should update navigation buttons for middle chapter', () => {
      storyUI.updateNavigationButtons(2, 5);

      expect(mockElements.prevButton.disabled).toBe(false);
      expect(mockElements.nextButton.disabled).toBe(false);
      expect(mockElements.nextButton.textContent).toBe('Next Chapter →');
    });

    test('should update navigation buttons for last chapter', () => {
      storyUI.updateNavigationButtons(4, 5);

      expect(mockElements.prevButton.disabled).toBe(false);
      expect(mockElements.nextButton.disabled).toBe(true);
      expect(mockElements.nextButton.textContent).toBe('Story Complete');
    });

    test('should handle missing navigation buttons gracefully', () => {
      storyUI.prevButton = null;
      storyUI.nextButton = null;

      expect(() => storyUI.updateNavigationButtons(1, 3)).not.toThrow();
    });
  });

  describe('UI State Management', () => {
    beforeEach(() => {
      storyUI.initialize();
    });

    test('should show introduction', () => {
      storyUI.showIntroduction('Test introduction');

      expect(mockElements.introductionText.textContent).toBe('Test introduction');
      expect(mockElements.introductionSection.style.display).toBe('block');
    });

    test('should hide introduction', () => {
      storyUI.hideIntroduction();

      expect(mockElements.introductionSection.style.display).toBe('none');
    });

    test('should show error', () => {
      storyUI.showError('Test error message');

      expect(mockElements.errorText.textContent).toBe('Test error message');
      expect(mockElements.errorSection.style.display).toBe('block');
    });

    test('should hide error', () => {
      storyUI.hideError();

      expect(mockElements.errorSection.style.display).toBe('none');
    });

    test('should show results', () => {
      storyUI.showResults();

      expect(mockElements.resultsSection.style.display).toBe('block');
    });

    test('should hide results', () => {
      storyUI.hideResults();

      expect(mockElements.resultsSection.style.display).toBe('none');
    });

    test('should show completion message', () => {
      storyUI.showCompletionMessage();

      expect(console.log).toHaveBeenCalledWith('📚 Story completion UI update');
    });

    test('should handle missing elements gracefully in state management', () => {
      storyUI.introductionSection = null;
      storyUI.errorSection = null;
      storyUI.resultsSection = null;

      expect(() => {
        storyUI.showIntroduction('test');
        storyUI.hideIntroduction();
        storyUI.showError('test');
        storyUI.hideError();
        storyUI.showResults();
        storyUI.hideResults();
      }).not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      storyUI.initialize();
      storyUI.currentStory = { title: 'Test Story' };
      storyUI.currentChapter = { title: 'Test Chapter' };
    });

    test('should reset UI to initial state', () => {
      const hideIntroSpy = jest.spyOn(storyUI, 'hideIntroduction');
      const hideErrorSpy = jest.spyOn(storyUI, 'hideError');
      const hideResultsSpy = jest.spyOn(storyUI, 'hideResults');
      const updateProgressSpy = jest.spyOn(storyUI, 'updateProgress');

      storyUI.reset();

      expect(storyUI.currentStory).toBeNull();
      expect(storyUI.currentChapter).toBeNull();
      expect(mockElements.storySelector.value).toBe('');
      expect(hideIntroSpy).toHaveBeenCalled();
      expect(hideErrorSpy).toHaveBeenCalled();
      expect(hideResultsSpy).toHaveBeenCalled();
      expect(updateProgressSpy).toHaveBeenCalledWith(1, 0);
      expect(mockElements.chapterTitle.textContent).toBe('');
      expect(mockElements.storyIntroduction.textContent).toBe('');
      expect(mockElements.storySetup.textContent).toBe('');
      expect(console.log).toHaveBeenCalledWith('📚 Story UI reset');
    });

    test('should handle missing elements gracefully during reset', () => {
      storyUI.storySelector = null;
      storyUI.chapterTitle = null;
      storyUI.storyIntroduction = null;
      storyUI.storySetup = null;

      expect(() => storyUI.reset()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing DOM elements during initialization', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);

      const newStoryUI = new StoryUI(mockEventBus);
      newStoryUI.initialize();

      expect(newStoryUI.storyPanel).toBeNull();
      expect(newStoryUI.storySelector).toBeNull();
    });

    test('should not set up event listeners for missing elements', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);

      const newStoryUI = new StoryUI(mockEventBus);
      
      expect(() => newStoryUI.initialize()).not.toThrow();
    });

    test('should handle story completed event with missing next button', () => {
      storyUI.initialize();
      storyUI.nextButton = null;

      const storyCompletedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:story-completed')[1];
      
      expect(() => storyCompletedHandler()).not.toThrow();
    });

    test('should handle empty insights array in processed narrative', () => {
      storyUI.initialize();
      const narrative = { insights: [] };

      storyUI.updateProcessedNarrative(narrative);

      expect(mockElements.insightsSection.innerHTML).toBe('<ul></ul>');
    });
  });

  describe('Integration', () => {
    test('should complete full story workflow', () => {
      storyUI.initialize();

      // 1. Stories are loaded
      const stories = [{ key: 'test-story', title: 'Test Story' }];
      const storiesLoadedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'stories:loaded')[1];
      storiesLoadedHandler(stories);

      // 2. Story is selected
      const changeHandler = mockElements.storySelector.addEventListener.mock.calls[0][1];
      changeHandler({ target: { value: 'test-story' } });
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:select', 'test-story');

      // 3. Story is loaded
      const storyData = {
        story: { metadata: { title: 'Test Story' } },
        totalChapters: 3
      };
      const storyLoadedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:story-loaded')[1];
      storyLoadedHandler(storyData);

      // 4. Chapter changes
      const chapterData = {
        chapter: { title: 'Chapter 1' },
        progress: { total: 3, current: 1 },
        chapterIndex: 0
      };
      const chapterChangedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:chapter-changed')[1];
      chapterChangedHandler(chapterData);

      // 5. Simulation is run
      const runClickHandler = mockElements.runSimulationBtn.addEventListener.mock.calls[0][1];
      runClickHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith('story:run-simulation');

      // 6. Simulation completes
      const simulationCompletedHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'story-engine:simulation-completed')[1];
      simulationCompletedHandler({ chapterIndex: 0 });

      expect(mockElements.resultsSection.style.display).toBe('block');
    });
  });
});
