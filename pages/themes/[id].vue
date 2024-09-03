<template>
    <Question :theme="route.params.id"></Question>
</template>
<script setup>
const route = useRoute()
</script>
