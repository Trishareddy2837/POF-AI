import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../src/app/AuthProvider';
import { DEMO_QUIZZES } from '../../src/data/quizCatalogue';
import { QuizzesPage } from '../../src/pages/AssessmentPages';
import { toDemoReview } from '../../src/services/assessments';

afterEach(()=>{localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();});
describe('assessment experience',()=>{
  it('scores fixed practice questions deterministically and treats unanswered items as incorrect',()=>{
    const questions=DEMO_QUIZZES[0].questions!;const correct=questions[0].options.find(option=>option.correct)!;const review=toDemoReview(questions,{[questions[0].id]:correct.id});
    expect(review.filter(item=>item.is_correct)).toHaveLength(1);expect(review).toHaveLength(4);expect(review[1].selected_option_id).toBeNull();
  });
  it('supports a demo student taking, reviewing, and completing an assessment',async()=>{
    vi.spyOn(window,'confirm').mockReturnValue(true);
    render(<MemoryRouter><AuthContext.Provider value={{session:null,user:null,loading:false}}><QuizzesPage/></AuthContext.Provider></MemoryRouter>);
    const card=screen.getByRole('heading',{name:'Programming Foundations'}).closest('article')!;
    fireEvent.click(within(card).getByRole('button',{name:'Start or resume assessment'}));
    const attempt=await screen.findByRole('region',{name:'Assessment in progress'});
    for(let i=0;i<4;i++){
      const question=DEMO_QUIZZES[0].questions!.find(item=>attempt.textContent?.includes(item.prompt))!;
      const correct=question.options.find(option=>option.correct)!;
      fireEvent.click(within(attempt).getByLabelText(new RegExp(correct.label)));
      if(i<3)fireEvent.click(within(attempt).getByRole('button',{name:'Next'}));
    }
    fireEvent.click(within(attempt).getByRole('button',{name:'Review answers'}));
    await waitFor(()=>expect(attempt.textContent).toContain('4 of 4 answered'));
    fireEvent.click(within(attempt).getByRole('button',{name:'Submit assessment'}));
    expect(await screen.findByText('Demo score calculated locally. It is not a verified assessment result.')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
