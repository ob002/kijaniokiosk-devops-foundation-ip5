pipeline {
    agent any

    environment {
        NEXUS_URL = 'http://192.168.0.106:8081'
        NEXUS_REPO = 'kijaniokiosk-npm'
        NEXUS_CREDENTIAL_ID = 'nexus-creds'
        SEMVER = '1.0.0'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()

                script {
                    def checkoutCommit = git(
                        branch: 'feature/week5-ci-pipeline',
                        url: 'https://github.com/ob002/kijaniokiosk-devops-foundation-ip5.git'
                    )

                    if (!checkoutCommit) {
                        error('Git checkout did not provide a commit ID.')
                    }

                    def fullCommit = checkoutCommit.toString()

                    if (fullCommit.length() < 7) {
                        error('Git returned an invalid commit ID.')
                    }

                    env.GIT_SHA = fullCommit.substring(0, 7)
                    env.VERSION = "${env.SEMVER}-${env.GIT_SHA}"

                    echo "Checked out commit: ${env.GIT_SHA}"
                    echo "Build version: ${env.VERSION}"
                }
            }
        }

        stage('Lint') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                echo 'Running Lint stage...'
                sh '''
                    set -eu
                    npm install
                    npm run lint
                '''
            }
        }

        stage('Build') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                echo 'Running Build stage...'
                sh '''
                    set -eu
                    npm install
                    npm run build
                '''
            }
        }

        stage('Verify') {
            parallel {
                stage('Test') {
                    agent {
                        docker {
                            image 'node:20-alpine'
                            reuseNode true
                        }
                    }
                    steps {
                        echo 'Running Tests...'
                        sh '''
                            set -eu
                            npm install
                            npm test
                        '''
                    }
                }

                stage('Security Audit') {
                    agent {
                        docker {
                            image 'node:20-alpine'
                            reuseNode true
                        }
                    }
                    steps {
                        echo 'Running Security Audit...'
                        sh '''
                            set -eu
                            npm install
                            npm audit --audit-level=high
                        '''
                    }
                }
            }
        }

        stage('Archive') {
            steps {
                echo 'Archiving build artifacts...'
                sh '''
                    set -eu
                    tar -czf "kijaniokiosk-payments-${VERSION}.tar.gz" dist/ package.json
                '''

                archiveArtifacts(
                    artifacts: "kijaniokiosk-payments-${VERSION}.tar.gz",
                    fingerprint: true
                )
            }
        }

        stage('Publish') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                echo 'Publishing to Nexus...'

                withCredentials([
                    usernamePassword(
                        credentialsId: "${NEXUS_CREDENTIAL_ID}",
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {
                    sh '''
                        set +x
                        set -eu

                        REGISTRY="${NEXUS_URL}/repository/${NEXUS_REPO}/"
                        AUTH="$(printf '%s' "${NEXUS_USER}:${NEXUS_PASS}" | base64 | tr -d '\\n')"

                        printf '%s\\n' \
                          "//192.168.0.106:8081/repository/${NEXUS_REPO}/:_auth=${AUTH}" \
                          "registry=${REGISTRY}" \
                          "always-auth=true" > .npmrc

                        trap 'rm -f .npmrc' EXIT

                        npm publish --registry="${REGISTRY}"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs notFailBuild: true
        }

        success {
            echo 'SUCCESS: Pipeline completed and artifact was published.'
            echo "Nexus repository: ${NEXUS_URL}/repository/${NEXUS_REPO}/"
        }

        failure {
            echo "FAILURE: Pipeline result: ${currentBuild.currentResult}"
        }

        changed {
            echo "CHANGED: Build result is ${currentBuild.currentResult}"
        }
    }
}
