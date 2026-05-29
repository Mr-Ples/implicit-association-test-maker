# Implicit Association Test Maker

An Implicit Association Test measures how quickly someone sorts words or images when two concepts are paired together. Faster responses in one pairing than another are interpreted as a relative association strength. 

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

Pilot mode is intentionally shorter than the full run. It uses only the first two single-category blocks and includes every stimulus in those blocks at least once before the pilot review screen.

## Existing IAT predictive validity

Do some eisting tests here: https://implicit.harvard.edu/implicit/takeatest.html


<div>

<table width="100%" cellpadding="6">
  <thead>
    <tr>
      <th align="left" width="10%">IAT domain</th>
      <th align="left" width="14%">Interpretation</th>
      <th align="left" width="18%">What it means in practice</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td >Sexual orientation IAT</td>
      <td>d ≈ 1.15–1.96</td>
      <td>Large to very large</td>
      <td>Gay participants usually show much faster same-sex positive associations; straight participants show the reverse. One of the strongest IAT domains because orientation is highly stable and deeply automatized.</td>
    </tr>
    <tr>
      <td >Sexual orientation IAT</td>
      <td>d ≈ 0.87–1.50</td>
      <td>Moderate-large to very large</td>
      <td>Implicit responses often align strongly with objective arousal measures, sometimes even more closely than self-report in ambiguous cases.</td>
    </tr>
    <tr>
      <td >Political IAT</td>
      <td>d ≈ 0.87–1.50</td>
      <td>Moderate-large to very large</td>
      <td>Conservatives and liberals show rapid automatic associations with party symbols, policies, or ideological words that strongly predict actual voting preferences.</td>
    </tr>
    <tr>
      <td >Suicide / death IAT</td>      
      <td>d ≈ 0.70–1.10</td>
      <td>Moderate-large</td>
      <td>People who implicitly associate “self” with “death” are statistically more likely to attempt suicide later. One of the clinically important IAT findings.</td>
    </tr>
    <tr>
      <td >Religion IAT</td>      
      <td>d ≈ 0.63–1.15</td>
      <td>Moderate to large</td>
      <td>Religious participants automatically associate religion with truth, morality, or self-identity more strongly than nonreligious participants.</td>
    </tr>
    <tr>
      <td >Gender-science IAT</td>      
      <td>d ≈ 0.63–1.01</td>
      <td>Moderate to large</td>
      <td>Countries with stronger implicit “male = science” associations tend to have fewer women in STEM fields.</td>
    </tr>
    <tr>
      <td >Phobia IAT</td>      
      <td>d ≈ 0.63–1.01</td>
      <td>Moderate to large</td>
      <td>Spider-phobic people rapidly associate spiders with danger and show measurable avoidance behavior.</td>
    </tr>
    <tr>
      <td >Smoking IAT</td>      
      <td>d ≈ 0.52–0.87</td>
      <td>Moderate</td>
      <td>Smokers often show stronger positive automatic associations with cigarettes; these can predict relapse risk after quitting attempts.</td>
    </tr>
    <tr>
      <td >Alcohol IAT</td>      
      <td>d ≈ 0.41–0.75</td>
      <td>Small-moderate</td>
      <td>Positive implicit alcohol associations correlate with binge drinking and difficulty controlling consumption.</td>
    </tr>
    <tr>
      <td >Gender-career IAT</td>      
      <td>d ≈ 0.52–0.87</td>
      <td>Moderate</td>
      <td>Stronger “male = career / female = family” associations correlate with conventional gender-role beliefs and occupational preferences.</td>
    </tr>
    <tr>
      <td >Race stereotype IAT</td>      
      <td>d ≈ 0.52–0.87</td>
      <td>Moderate</td>
      <td>Faster “Black = threat” associations predict greater false-positive “shoot” decisions in laboratory simulations.</td>
    </tr>
    <tr>
      <td >Race attitude IAT</td>      
      <td>d ≈ 0.41–0.75</td>
      <td>Small-moderate</td>
      <td>Higher implicit racial bias predicts subtler behaviors like interpersonal distance, nervousness, or reduced warmth during interracial interactions.</td>
    </tr>
    <tr>
      <td >Race attitude IAT</td>      
      <td>d ≈ 0.30–0.63</td>
      <td>Small to moderate</td>
      <td>The effects are usually not dramatic overt discrimination; they appear more in micro-behaviors and split-second judgments.</td>
    </tr>
    <tr>
      <td >Consumer-brand IAT</td>      
      <td>d ≈ 0.41–0.87</td>
      <td>Small-moderate to moderate</td>
      <td>Automatic positive reactions toward brands often predict spontaneous consumer choices better than stated preferences.</td>
    </tr>
    <tr>
      <td >Thin-fat attitude IAT</td>      
      <td>d ≈ 0.41–0.75</td>
      <td>Small-moderate</td>
      <td>Many participants implicitly associate obesity with laziness or incompetence, which predicts biased evaluations.</td>
    </tr>
    <tr>
      <td >Anxiety IAT</td>      
      <td>d ≈ 0.41–0.75</td>
      <td>Small-moderate</td>
      <td>People with anxiety disorders tend to associate self-related concepts with threat or vulnerability more rapidly.</td>
    </tr>
    <tr>
      <td >Math-gender stereotype IAT</td>      
      <td>d ≈ 0.30–0.63</td>
      <td>Small to moderate</td>
      <td>Implicit stereotypes can modestly predict reduced performance when stereotype threat is activated.</td>
    </tr>
    <tr>
      <td >Age attitude IAT</td>      
      <td>d ≈ 0.30–0.63</td>
      <td>Small to moderate</td>
      <td>Younger faces are implicitly preferred by many participants, and this can affect judgments about competence or employability.</td>
    </tr>
    <tr>
      <td >Self-esteem IAT</td>      
      <td>d ≈ 0.20–0.52</td>
      <td>Very small to moderate</td>
      <td>Implicit self-esteem correlates only weakly with consciously reported self-esteem, suggesting partially distinct psychological systems.</td>
    </tr>
  </tbody>
</table>

</div>
