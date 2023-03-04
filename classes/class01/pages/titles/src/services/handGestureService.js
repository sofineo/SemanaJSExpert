
export default class HandGestureService {
  #gestureEstimator
  #handPoseDetection
  #handsVersion
  #detector = null
  #gestureStrings

  constructor({ fingerpose, handPoseDetection, handsVersion, knownGestures, gestureStrings
  }) {
    this.#gestureEstimator = new fingerpose.GestureEstimator(knownGestures)
    this.#handPoseDetection = handPoseDetection
    this.#handsVersion = handsVersion
    this.#gestureStrings = gestureStrings
}

  async estimate(keypoints3D) {
    const predictions = await this.#gestureEstimator.estimate(
      this.#getLandMarksFromKeypoints(keypoints3D), 
      //porcentagem de confiança do gesto (90%)
      9
      )
      return predictions.gestures
      console.log(predictions)
  }

  //função async * que assim que for lendo vai entregando os dados
  async * detectGestures(predictions) {
    for(const hand of predictions) {
      if (!hand.keypoints3D) continue

      const gestures = await this.estimate(hand.keypoints3D)
      if(!gestures.length) continue;

      const result = gestures.reduce(( previous, current) => (previous.score > current.score) ? previous : current)
      
      const { x, y } = hand.keypoints.find(keypoint => keypoint.name === 'index_finger_tip')
      //ao identificar um gesto, já notificará quem chamou e continuará identificando o restante
      yield { event: result.name, x, y}
      console.log('detected', this.#gestureStrings[result.name])
    }
  }

  #getLandMarksFromKeypoints(keypoints3D) {
    return keypoints3D.map(keypoint => [
      keypoint.x, keypoint.y, keypoint.z
    ])
  }

  async estimateHands(video) {
    return this.#detector.estimateHands(video, {
      flipHorizontal: true
    })
  }

  async initializeDetector() {
    if(this.#detector) return this.#detector

    const detectorConfig = {
      runtime: 'mediapipe', // or 'tfjs',
    //fixaremos uma versão para evitar futuras alterações, não quebrando em produçãoo
      solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${this.#handsVersion}`,
      // full é o mais pesado e o mais preciso, porém o lite já sera suficiente
      modelType: 'lite',
      maxHands: 2,
    }
    this.#detector = await handPoseDetection.createDetector( this.#handPoseDetection.SupportedModels.MediaPipeHands, detectorConfig
    )

    return this.#detector
  }

}