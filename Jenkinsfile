pipeline {
  agent any
  environment {
    DOCKERHUB_CREDENTIALS=credentials('dockerhub-token')
    IMAGE_VERSION='1.0'
  }
  stages {
    stage('Cloning our Git') {
      steps {
        sh 'echo "Cloning repository..."'
        sshagent (credentials: ['jenkins-ssh']) {
          sh 'git clone git@github.com:neenus/doc-hub-server.git'
        }
      }
    }
    stage('Build docker images') {
      steps {
        sh 'echo "Building docker image..."'
        sh 'docker build -t neenus007/upload-server:${IMAGE_VERSION}.${BUILD_NUMBER} .'
        sh 'docker build -t neenus007/upload-server:latest .'
      }
    }
    stage('Login to DockerHub') {
      steps {
        sh 'echo "Logging in to DockerHub..."'
        sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
      }
    }
    stage('Push images to DockerHub') {
      steps {
        sh 'echo "Pushing to DockerHub..."'
        sh 'docker push neenus007/upload-server:${IMAGE_VERSION}.${BUILD_NUMBER}'
        sh 'docker push neenus007/upload-server:latest'
      }
    }
    stage('Logout from DockerHub') {
      steps {
        sh 'echo "Logging out from DockerHub..."'
        sh 'docker logout'
      }
    }
  }
}