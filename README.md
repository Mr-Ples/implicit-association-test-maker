# Implicit Association Test Maker

Full-stack React Router v7 app for creating, running, saving, and analyzing Implicit Association Tests on the edge with SQLite-backed storage.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database:

   ```bash
   npx wrangler d1 create iat-maker
   ```

3. Put the returned `database_id` into `wrangler.jsonc`.

4. Apply the migration locally and remotely as needed:

   ```bash
   npx wrangler d1 migrations apply iat-maker --local
   npx wrangler d1 migrations apply iat-maker --remote
   ```

5. Run locally:

   ```bash
   npm run dev
   ```

6. Deploy:

   ```bash
   npm run deploy
   ```

## Research Scoring

The app stores each participant's questionnaire answers, trial-level responses, latency, correctness, and computed score. Scoring follows the improved IAT D-score approach:

- Seven-block IAT procedure.
- Compatible-first and incompatible-first orders are randomly counterbalanced per participant.
- Scored blocks are compatible practice/critical and incompatible practice/critical blocks.
- Latencies below 300 ms or above 10,000 ms are excluded from scoring.
- Error trials receive a block-level correct-response mean plus 600 ms penalty.
- Practice and critical blocks are standardized separately, then averaged.
- Responses with more than 10% ultra-fast scored trials are flagged invalid.

Positive D-scores indicate faster compatible-pair classifications than incompatible-pair classifications for the configured category order.


| IAT domain                 |                         Predicted outcome | Typical association | Approx. Cohen’s d | Interpretation               | What it means in practice                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------: | ------------------: | ----------------: | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sexual orientation IAT     |        Self-identified sexual orientation |         r ≈ .50–.70 |     d ≈ 1.15–1.96 | Large to very large          | Gay participants usually show much faster same-sex positive associations; straight participants show the reverse. One of the strongest IAT domains because orientation is highly stable and deeply automatized. |
| Sexual orientation IAT     | Genital or physiological arousal patterns |         r ≈ .40–.60 |     d ≈ 0.87–1.50 | Moderate-large to very large | Implicit responses often align strongly with objective arousal measures, sometimes even more closely than self-report in ambiguous cases.                                                                       |
| Political IAT              |       Voting behavior / party affiliation |         r ≈ .40–.60 |     d ≈ 0.87–1.50 | Moderate-large to very large | Conservatives and liberals show rapid automatic associations with party symbols, policies, or ideological words that strongly predict actual voting preferences.                                                |
| Suicide / death IAT        |                   Future suicide attempts |       d ≈ 0.70–1.10 |     d ≈ 0.70–1.10 | Moderate-large               | People who implicitly associate “self” with “death” are statistically more likely to attempt suicide later. One of the clinically important IAT findings.                                                       |
| Religion IAT               |       Religious affiliation / religiosity |         r ≈ .30–.50 |     d ≈ 0.63–1.15 | Moderate to large            | Religious participants automatically associate religion with truth, morality, or self-identity more strongly than nonreligious participants.                                                                    |
| Gender-science IAT         |   National STEM participation differences |         r ≈ .30–.45 |     d ≈ 0.63–1.01 | Moderate to large            | Countries with stronger implicit “male = science” associations tend to have fewer women in STEM fields.                                                                                                         |
| Phobia IAT                 |                        Avoidance behavior |         r ≈ .30–.45 |     d ≈ 0.63–1.01 | Moderate to large            | Spider-phobic people rapidly associate spiders with danger and show measurable avoidance behavior.                                                                                                              |
| Smoking IAT                |          Smoking relapse / smoking status |         r ≈ .25–.40 |     d ≈ 0.52–0.87 | Moderate                     | Smokers often show stronger positive automatic associations with cigarettes; these can predict relapse risk after quitting attempts.                                                                            |
| Alcohol IAT                |               Hazardous drinking behavior |         r ≈ .20–.35 |     d ≈ 0.41–0.75 | Small-moderate               | Positive implicit alcohol associations correlate with binge drinking and difficulty controlling consumption.                                                                                                    |
| Gender-career IAT          |       Traditional gender-role preferences |         r ≈ .25–.40 |     d ≈ 0.52–0.87 | Moderate                     | Stronger “male = career / female = family” associations correlate with conventional gender-role beliefs and occupational preferences.                                                                           |
| Race stereotype IAT        |          Shooter bias / threat perception |         r ≈ .25–.40 |     d ≈ 0.52–0.87 | Moderate                     | Faster “Black = threat” associations predict greater false-positive “shoot” decisions in laboratory simulations.                                                                                                |
| Race attitude IAT          |               Interracial social behavior |         r ≈ .20–.35 |     d ≈ 0.41–0.75 | Small-moderate               | Higher implicit racial bias predicts subtler behaviors like interpersonal distance, nervousness, or reduced warmth during interracial interactions.                                                             |
| Race attitude IAT          |      Nonverbal friendliness / eye contact |         r ≈ .15–.30 |     d ≈ 0.30–0.63 | Small to moderate            | The effects are usually not dramatic overt discrimination; they appear more in micro-behaviors and split-second judgments.                                                                                      |
| Consumer-brand IAT         |                     Purchasing preference |         r ≈ .20–.40 |     d ≈ 0.41–0.87 | Small-moderate to moderate   | Automatic positive reactions toward brands often predict spontaneous consumer choices better than stated preferences.                                                                                           |
| Thin-fat attitude IAT      |               Anti-obesity discrimination |         r ≈ .20–.35 |     d ≈ 0.41–0.75 | Small-moderate               | Many participants implicitly associate obesity with laziness or incompetence, which predicts biased evaluations.                                                                                                |
| Anxiety IAT                |         Anxiety severity / panic symptoms |         r ≈ .20–.35 |     d ≈ 0.41–0.75 | Small-moderate               | People with anxiety disorders tend to associate self-related concepts with threat or vulnerability more rapidly.                                                                                                |
| Math-gender stereotype IAT |  Math performance under stereotype threat |         r ≈ .15–.30 |     d ≈ 0.30–0.63 | Small to moderate            | Implicit stereotypes can modestly predict reduced performance when stereotype threat is activated.                                                                                                              |
| Age attitude IAT           |              Hiring bias / age preference |         r ≈ .15–.30 |     d ≈ 0.30–0.63 | Small to moderate            | Younger faces are implicitly preferred by many participants, and this can affect judgments about competence or employability.                                                                                   |
| Self-esteem IAT            |                      Explicit self-esteem |         r ≈ .10–.25 |     d ≈ 0.20–0.52 | Very small to moderate       | Implicit self-esteem correlates only weakly with consciously reported self-esteem, suggesting partially distinct psychological systems.                                                                         |


---

bad
pain
failure
hate
fear
terrible
ugly
evil
loss
danger
poison
angry
corrupt
violence
suffering
grief
death

joy
peace
love
pleasure
success
happy
excellent
wonderful
beautiful
friend
safe
honest
valuable
healthy
delight
freedom
good

being
balanced
perfect
presence
alive
whole
essence
enduring
eternal
existence
grounded
centered
peaceful
stable
complete
harmonious


becoming
growing
changing
evolving
emerging
unfolding
transforming
developing
moving
shifting
progressing
adapting
learning
forming
striving
transition
