pipeline {
    agent {
        label 'master'
    }
    stages {
        stage('Frontend Tests') {
            agent {
                docker {
                    image 'eduwass/docker-node-git'
                    reuseNode true
                }
            }
            environment {
                HOME = '.'
            }
            options {
                skipDefaultCheckout()
            }
            steps {
                dir('.') {
                    sh(
                        label: 'Setup frontend toolchain',
                        script: 'npm install'
                    )
                    sh (
                        label : 'Run frontend tests',
                        script: 'npm run test'
                    )
                }
            }
        }
    }
}